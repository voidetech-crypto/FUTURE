import { Hono } from "hono";

const polymarketRouter = new Hono();

// Base URLs
const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const CLOB_API_BASE = "https://clob.polymarket.com";
const DATA_API_BASE = "https://data-api.polymarket.com";

/**
 * Get active markets from Gamma API
 * Docs: https://docs.polymarket.com/developers/gamma-markets-api/overview
 */
// Simple in-memory cache for markets (5 minute TTL)
const marketsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

polymarketRouter.get("/markets", async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query("limit") || "200"), 500); // Increased from 100 to 500
    const category = c.req.query("category");
    const search = c.req.query("search");
    const marketType = c.req.query("marketType");
    const offset = parseInt(c.req.query("offset") || "0");

    // Create cache key
    const cacheKey = `markets:${limit}:${category || 'all'}:${search || ''}:${marketType || 'all'}:${offset}`;
    const cached = marketsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return c.json(cached.data);
    }

    // console.log(`[MARKETS] Fetching from Gamma API with limit=${limit}, offset=${offset}`);

    // Use /markets endpoint directly - it has prices, volume, etc.
    // Fallback to /events/pagination if needed
    let gammaUrl = `${GAMMA_API_BASE}/markets?limit=${limit}&offset=${offset}&active=true&archived=false&closed=false&order=volume24hr&ascending=false`;
    
    // Add search if provided (if markets endpoint supports it)
    if (search && search.trim().length >= 3) {
      gammaUrl += `&search=${encodeURIComponent(search.trim())}`;
    }

    // console.log(`[MARKETS] Gamma API URL: ${gammaUrl}`);
    
    let gammaResponse = await fetch(gammaUrl);
    
    // If markets endpoint fails or returns empty, try events/pagination
    if (!gammaResponse.ok || gammaResponse.status === 404) {
      console.log(`[MARKETS] Markets endpoint failed, trying events/pagination`);
      gammaUrl = `${GAMMA_API_BASE}/events/pagination?limit=${limit}&offset=${offset}&active=true&archived=false&closed=false&order=volume24hr&ascending=false`;
      if (search && search.trim().length >= 3) {
        gammaUrl += `&search=${encodeURIComponent(search.trim())}`;
      }
      gammaResponse = await fetch(gammaUrl);
    }
    if (!gammaResponse.ok) {
      const errorText = await gammaResponse.text();
      console.error(`[MARKETS] Gamma API error: ${gammaResponse.status} ${gammaResponse.statusText}`, errorText);
      throw new Error(`Gamma API error: ${gammaResponse.status} ${gammaResponse.statusText}`);
    }

    let gammaData;
    try {
      gammaData = await gammaResponse.json();
    } catch (parseError) {
      console.error(`[MARKETS] Failed to parse Gamma API response:`, parseError);
      throw new Error(`Failed to parse Gamma API response`);
    }
    
          // Markets endpoint returns array directly, events/pagination might wrap in data
          let markets = Array.isArray(gammaData) ? gammaData : (gammaData.data || gammaData || []);
          
          if (!Array.isArray(markets)) {
            console.warn(`[MARKETS] Gamma API did not return an array. Response type: ${typeof gammaData}, keys:`, Object.keys(gammaData || {}));
            console.warn(`[MARKETS] Response preview:`, JSON.stringify(gammaData).substring(0, 500));
            markets = [];
          }

          // Removed verbose logging

    // Removed verbose logging for performance

     // Transform markets directly - NO FILTERS
    const transformedMarkets = markets.map((market: any) => {
      // Safety check
      if (!market || typeof market !== 'object') {
        console.warn(`[MARKETS] Skipping invalid market:`, market);
        return null;
      }
      
      // Markets endpoint returns markets directly (not wrapped in events)
      // If we got an event from events/pagination, extract its first market
      const primaryMarket = market.markets && Array.isArray(market.markets) && market.markets.length > 0 
        ? market.markets[0] 
        : market;
      
      // Get outcomes - outcomes might be a string (JSON) or array
      let outcomes = [];
      if (primaryMarket.outcomes) {
        if (typeof primaryMarket.outcomes === 'string') {
          try {
            outcomes = JSON.parse(primaryMarket.outcomes);
          } catch {
            // If not JSON, try splitting by comma
            outcomes = primaryMarket.outcomes.split(',').map((o: string) => ({ name: o.trim() }));
          }
        } else if (Array.isArray(primaryMarket.outcomes)) {
          outcomes = primaryMarket.outcomes;
        }
      }
      
      // Get outcomePrices - Gamma API returns this as a JSON string
      let outcomePrices: any = {};
      if (primaryMarket.outcomePrices) {
        if (typeof primaryMarket.outcomePrices === 'string') {
          try {
            outcomePrices = JSON.parse(primaryMarket.outcomePrices);
          } catch {
            // Silently ignore parse errors for performance
          }
        } else if (typeof primaryMarket.outcomePrices === 'object') {
          outcomePrices = primaryMarket.outcomePrices;
        }
      }
      
      // Get prices from market - use lastTradePrice, bestBid, bestAsk
      const lastTradePrice = primaryMarket.lastTradePrice ?? 0;
      const bestBid = primaryMarket.bestBid ?? 0;
      const bestAsk = primaryMarket.bestAsk ?? 0;
      // Removed verbose debugging logs for performance

      // Extract all outcomes with prices
      // Gamma API: prices are in outcomePrices object or calculated from lastTradePrice
      const outcomesWithPrices = outcomes.map((o: any, index: number) => {
        let priceRaw: number | null = null;
        
        // Method 1: Check if outcomePrices has a price for this outcome
        const outcomeName = o.name || o.outcome || o.label || String(index);
        if (outcomePrices && typeof outcomePrices === 'object') {
          // outcomePrices might be keyed by outcome name or index
          priceRaw = outcomePrices[outcomeName] ?? 
                    outcomePrices[index] ?? 
                    outcomePrices[`outcome${index}`] ??
                    null;
        }
        
        // Method 2: If outcome is an object, check its price fields
        if (priceRaw === null && typeof o === 'object' && o !== null) {
          priceRaw = o.price ?? 
                    o.priceNum ?? 
                    o.lastPrice ?? 
                    o.currentPrice ??
                    o.prob ??
                    o.probability ??
                    null;
        }
        
        // Method 3: For binary markets, calculate from lastTradePrice
        if (priceRaw === null && outcomes.length === 2 && lastTradePrice > 0) {
          if (index === 0 || outcomeName.toLowerCase().includes('yes')) {
            priceRaw = lastTradePrice;
          } else {
            priceRaw = 1 - lastTradePrice;
          }
        }
        
        // Method 4: Use bestBid/bestAsk midpoint
        if (priceRaw === null && bestBid > 0 && bestAsk > 0) {
          const midPrice = (bestBid + bestAsk) / 2;
          if (index === 0 || outcomeName.toLowerCase().includes('yes')) {
            priceRaw = midPrice;
          } else {
            priceRaw = 1 - midPrice;
          }
        }
        
        // Method 5: Equal distribution fallback for multi-outcome
        if (priceRaw === null && outcomes.length > 2) {
          priceRaw = 1 / outcomes.length;
        }
        
        const price = priceRaw !== null && priceRaw !== undefined 
          ? (typeof priceRaw === 'number' ? priceRaw : parseFloat(String(priceRaw)) || 0)
          : 0;
        
        const finalPrice = Math.max(0, Math.min(1, price));
        
        return {
          name: outcomeName,
          price: finalPrice,
          rawPrice: priceRaw // Keep for debugging
        };
      }).filter(o => o.name); // Remove outcomes without names
      // Removed verbose price warning logs for performance

      // Sort by price (highest first) to get top outcomes
      outcomesWithPrices.sort((a, b) => b.price - a.price);

      // For Yes/No markets, use yesPrice/noPrice
      // For other markets, we'll use the top 2 outcomes
      const isYesNo = outcomesWithPrices.some(o => 
        o.name.toLowerCase().includes('yes') || o.name.toLowerCase().includes('no')
      );

      let yesPrice = 0;
      let noPrice = 0;

      if (isYesNo && outcomesWithPrices.length >= 2) {
        // Find Yes and No outcomes
        const yesOutcome = outcomesWithPrices.find(o => o.name.toLowerCase().includes('yes')) || outcomesWithPrices[0];
        const noOutcome = outcomesWithPrices.find(o => o.name.toLowerCase().includes('no')) || outcomesWithPrices[1] || outcomesWithPrices[0];
        
        yesPrice = yesOutcome.price;
        noPrice = noOutcome.price;

        // Ensure prices sum correctly for binary markets
        if (yesPrice > 0 && noPrice === 0) {
          noPrice = 1 - yesPrice;
        } else if (noPrice > 0 && yesPrice === 0) {
          yesPrice = 1 - noPrice;
        }
      } else {
        // For multi-outcome markets, use top 2 outcomes
        if (outcomesWithPrices.length >= 2) {
          yesPrice = outcomesWithPrices[0].price;
          noPrice = outcomesWithPrices[1].price;
        } else if (outcomesWithPrices.length === 1) {
          yesPrice = outcomesWithPrices[0].price;
          noPrice = 1 - yesPrice;
        }
      }

      // Get event for additional metadata if available (must be before volume check)
      const event = primaryMarket.events && Array.isArray(primaryMarket.events) && primaryMarket.events.length > 0
        ? primaryMarket.events[0]
        : null;
      
      // Get 24hr volume from Gamma API - try multiple possible field names
      let volume24hrNum = 0;
      if (primaryMarket.volume24hr !== undefined && primaryMarket.volume24hr !== null) {
        volume24hrNum = parseFloat(String(primaryMarket.volume24hr)) || 0;
      } else if (primaryMarket.volume24hrClob !== undefined && primaryMarket.volume24hrClob !== null) {
        volume24hrNum = parseFloat(String(primaryMarket.volume24hrClob)) || 0;
      } else if (primaryMarket.volume24Hr !== undefined && primaryMarket.volume24Hr !== null) {
        volume24hrNum = parseFloat(String(primaryMarket.volume24Hr)) || 0;
      } else if (event?.volume24hr !== undefined && event?.volume24hr !== null) {
        volume24hrNum = parseFloat(String(event.volume24hr)) || 0;
      }
      
      // Debug: Log if we found volume24hr (remove after debugging)
      if (volume24hrNum > 0) {
        console.log(`[MARKETS] Found 24hr volume: ${volume24hrNum} for market ${primaryMarket.id || 'unknown'}`);
      }
      
      // Get all-time volume (total volume) - this is separate from 24hr volume
      let volumeAllTimeNum = 0;
      // Try volumeNum first (this is usually all-time)
      if (primaryMarket.volumeNum !== undefined && primaryMarket.volumeNum !== null) {
        volumeAllTimeNum = parseFloat(String(primaryMarket.volumeNum)) || 0;
      } 
      // If volumeNum doesn't exist, try volume (but only if it's not the same as volume24hr)
      else if (primaryMarket.volume !== undefined && primaryMarket.volume !== null) {
        const volumeParsed = parseFloat(String(primaryMarket.volume).replace(/[^0-9.]/g, '')) || 0;
        // If volume24hr exists and is different, then volume is likely all-time
        if (volume24hrNum > 0 && volumeParsed !== volume24hrNum) {
          volumeAllTimeNum = volumeParsed;
        } else if (volume24hrNum === 0) {
          // If no 24hr volume, then volume is probably all-time
          volumeAllTimeNum = volumeParsed;
        }
      } else if (primaryMarket.volumeClob !== undefined && primaryMarket.volumeClob !== null) {
        volumeAllTimeNum = parseFloat(String(primaryMarket.volumeClob)) || 0;
      } else if (event?.volume !== undefined && event?.volume !== null) {
        volumeAllTimeNum = parseFloat(String(event.volume).replace(/[^0-9.]/g, '')) || 0;
      }
      
      // Use 24hr volume for sorting/display if available, otherwise use all-time
      const volumeNum = volume24hrNum > 0 ? volume24hrNum : volumeAllTimeNum;
      
      // Format all-time volume for display
      let volumeDisplay = "$0";
      if (volumeAllTimeNum >= 1000000) {
        volumeDisplay = `$${(volumeAllTimeNum / 1000000).toFixed(1)}M`;
      } else if (volumeAllTimeNum >= 1000) {
        volumeDisplay = `$${(volumeAllTimeNum / 1000).toFixed(1)}K`;
      } else if (volumeAllTimeNum > 0) {
        volumeDisplay = `$${volumeAllTimeNum.toFixed(0)}`;
      }
      
      // Format 24hr volume for display
      let volume24hrDisplay = "$0";
      if (volume24hrNum >= 1000000) {
        volume24hrDisplay = `$${(volume24hrNum / 1000000).toFixed(1)}M`;
      } else if (volume24hrNum >= 1000) {
        volume24hrDisplay = `$${(volume24hrNum / 1000).toFixed(1)}K`;
      } else if (volume24hrNum > 0) {
        volume24hrDisplay = `$${volume24hrNum.toFixed(0)}`;
      }

      // Extract category from tags - handle both string arrays and object arrays
      const tags = primaryMarket.tags || (event?.tags) || [];
      let categoryFromTags = "Other";
      
      if (tags.length > 0) {
        // Check if tags are objects or strings
        if (typeof tags[0] === 'object' && tags[0] !== null) {
          // Tags are objects with properties like {id, label, slug, etc}
          const categoryTag = tags.find((tag: any) => 
            ["Politics", "Sports", "Finance", "Crypto", "Geopolitics", "Earnings", "Tech", "Culture", "World", "Economy", "Elections"].includes(tag.name || tag.label || "")
          ) || tags[0];
          categoryFromTags = categoryTag.name || categoryTag.label || categoryTag.slug || "Other";
        } else {
          // Tags are strings
          categoryFromTags = tags.find((tag: string) => 
            ["Politics", "Sports", "Finance", "Crypto", "Geopolitics", "Earnings", "Tech", "Culture", "World", "Economy", "Elections"].includes(tag)
          ) || tags[0] || "Other";
        }
      }

      // Get top 2 outcomes for display (sorted by price, highest first)
      // For multichoice markets, we'll try to get noPrice from outcome object if available
      const topOutcomes = outcomesWithPrices.slice(0, 2).map((o: any) => {
        // Check if the original outcome object has a noPrice field
        const originalOutcome: any = outcomes.find((out: any) => {
          const outName = out.name || out.outcome || out.label || "";
          return outName === o.name || outName.toLowerCase() === o.name.toLowerCase();
        });
        const noPrice = originalOutcome?.noPrice ?? 
                       originalOutcome?.no_price ?? 
                       undefined;
        
        return {
          name: o.name,
          price: o.price,
          noPrice: noPrice !== undefined ? (typeof noPrice === 'number' ? noPrice : parseFloat(String(noPrice))) : undefined
        };
      });
      
        // If prices are all 0, try to get prices from the market's tokens or other fields
      if (topOutcomes.every(o => o.price === 0) && outcomes.length > 0) {
        // Check if market has tokens array (CLOB format)
        if (primaryMarket.tokens && Array.isArray(primaryMarket.tokens)) {
          const tokensWithPrices = primaryMarket.tokens.map((t: any) => {
            const tokenPrice = t.price ?? t.priceNum ?? t.lastPrice ?? 0;
            return {
              name: t.outcome || t.name || "",
              price: typeof tokenPrice === 'number' ? tokenPrice : parseFloat(String(tokenPrice)) || 0
            };
          }).filter((t: any) => t.name && t.price > 0);
          
          if (tokensWithPrices.length > 0) {
            tokensWithPrices.sort((a: any, b: any) => b.price - a.price);
            topOutcomes[0] = { ...tokensWithPrices[0], noPrice: undefined };
            if (tokensWithPrices.length > 1) {
              topOutcomes[1] = { ...tokensWithPrices[1], noPrice: undefined };
            }
            // Update yesPrice and noPrice too
            if (tokensWithPrices.length >= 2) {
              yesPrice = tokensWithPrices[0].price;
              noPrice = tokensWithPrices[1].price;
            } else if (tokensWithPrices.length === 1) {
              yesPrice = tokensWithPrices[0].price;
              noPrice = 1 - yesPrice;
            }
            // Removed verbose logging
          }
        }
        
        // If still no prices, check if there's a price24hr or other price fields on the event itself
        if (topOutcomes.every(o => o.price === 0)) {
          // Try to use equal distribution or check event-level price fields
          if (outcomes.length >= 2) {
            // Equal probability fallback
            const equalProb = 1 / outcomes.length;
            yesPrice = equalProb;
            noPrice = equalProb;
            topOutcomes[0] = { name: outcomesWithPrices[0].name, price: equalProb, noPrice: undefined };
            if (outcomesWithPrices.length > 1) {
              topOutcomes[1] = { name: outcomesWithPrices[1].name, price: equalProb, noPrice: undefined };
            }
            // Removed verbose logging
          }
        }
      }

      // Get price change percentages from market
      const priceChange24h = primaryMarket.oneDayPriceChange ?? 0;
      const priceChange1h = primaryMarket.oneHourPriceChange ?? 0;
      const priceChange1w = primaryMarket.oneWeekPriceChange ?? 0;
      const priceChange1m = primaryMarket.oneMonthPriceChange ?? 0;
      
      return {
        id: primaryMarket.id || event.id || primaryMarket.questionID || event.question_id || event.condition_id,
        title: primaryMarket.question || event.question || event.title || "",
        category: categoryFromTags,
        slug: primaryMarket.slug || "",
        image: primaryMarket.image || primaryMarket.icon || (event?.image) || (event?.icon) || "",
        description: primaryMarket.description || (event?.description) || "",
        yesPrice: yesPrice,
        noPrice: noPrice,
        volume: volumeDisplay,
        volumeNum: volumeNum,
        volume24hr: volume24hrDisplay,
        volume24hrNum: volume24hrNum,
        change: priceChange24h ? `${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)}%` : "0%",
        trending: volumeNum > 0,
        endDate: primaryMarket.endDateIso || primaryMarket.endDate || (event?.endDate) || "",
        liquidity: "$0",
        lastPrice: yesPrice,
        bestBid: primaryMarket.bestBid || bestBid || 0,
        bestAsk: primaryMarket.bestAsk || bestAsk || 0,
        hourlyChange: priceChange1h ? `${priceChange1h >= 0 ? '+' : ''}${priceChange1h.toFixed(2)}%` : "0%",
        weeklyChange: priceChange1w ? `${priceChange1w >= 0 ? '+' : ''}${priceChange1w.toFixed(2)}%` : "0%",
        monthlyChange: priceChange1m ? `${priceChange1m >= 0 ? '+' : ''}${priceChange1m.toFixed(2)}%` : "0%",
        outcomes: outcomesWithPrices.map(o => o.name),
        topOutcomes: topOutcomes, // Top 2 outcomes with prices for display
        isYesNo: isYesNo
      };
    }).filter((m: any) => m !== null); // Remove any null entries from invalid events

    // Removed verbose logging for performance

    // Apply market type sorting (Gamma already sorted by volume24hr, but we can re-sort if needed)
    if (marketType && marketType !== "all") {
      switch (marketType) {
        case "new":
          transformedMarkets.sort((a, b) => 
            new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime()
          );
          break;
        case "breaking":
          transformedMarkets.sort((a, b) => {
            if (b.volumeNum !== a.volumeNum) return b.volumeNum - a.volumeNum;
            return new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime();
          });
          break;
        // "trending" and "volume" already sorted by Gamma API
      }
    }

    const response = {
      success: true,
      markets: transformedMarkets,
      total: transformedMarkets.length
    };
    
    // Cache the response
    marketsCache.set(cacheKey, { data: response, timestamp: Date.now() });
    
    // Clean up old cache entries (keep last 50)
    if (marketsCache.size > 50) {
      const oldestKey = Array.from(marketsCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
      if (oldestKey) marketsCache.delete(oldestKey);
    }
    
    return c.json(response);

  } catch (error: any) {
    console.error("[MARKETS] Error:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to fetch markets",
      markets: [],
      total: 0
    }, 500);
  }
});

// Get single market by ID
polymarketRouter.get("/markets/:id", async (c) => {
  try {
    const marketId = c.req.param("id");
    
    if (!marketId) {
      return c.json({ success: false, error: "Market ID is required" }, 400);
    }

    console.log(`[MARKET/:id] Attempting to fetch market with ID: ${marketId}`);

    let markets: any[] = [];
    let market: any = null;
    let foundViaMethod = "";
    let parentEvent: any = null; // Store the event if we find it via Strategy 3

    // Strategy 3: Try events endpoint
    try {
      const eventUrl = `${GAMMA_API_BASE}/events/${marketId}`;
      console.log(`[MARKET/:id] Trying Strategy 3: ${eventUrl}`);
      const eventResponse = await fetch(eventUrl);
      
      if (eventResponse.ok) {
        const event = await eventResponse.json();
        
        if (event.markets && Array.isArray(event.markets) && event.markets.length > 0) {
          // Found an event with multiple markets - this is a multi-choice market
          markets = event.markets;
          market = event.markets[0]; // Use first market for data structure, but use event for title
          parentEvent = event; // Store the event to use its title/question
          foundViaMethod = "events endpoint";
          console.log(`[MARKET/:id] Found ${event.markets.length} markets via Strategy 3 (events)`);
          console.log(`[MARKET/:id] Event question: ${event.question}`);
          console.log(`[MARKET/:id] Event ID: ${event.id}`);
        } else if (event.question || event.id) {
          // Event exists but no markets - return event data
          const outcomes = event.outcomes || [];
          const yesPrice = parseFloat(outcomes[0]?.price || "0") || 0;
          const noPrice = parseFloat(outcomes[1]?.price || "0") || (1 - yesPrice);

          return c.json({
            success: true,
            market: {
              id: event.id || marketId,
              title: event.question || "",
              yesPrice: yesPrice,
              noPrice: noPrice,
            }
          });
        }
      }
    } catch (e) {
      console.log(`[MARKET/:id] Strategy 3 failed:`, e);
    }

    // If still not found, return error
    if (markets.length === 0 || !market) {
      console.error(`[MARKET/:id] No markets found for ID: ${marketId} via events endpoint`);
      return c.json({ success: false, error: `Market not found: ${marketId}` }, 404);
    }
    
    console.log(`[MARKET/:id] Market found via: ${foundViaMethod}`);
    console.log(`[MARKET/:id] API Response - markets array length: ${markets.length}`);
    console.log(`[MARKET/:id] First market keys:`, Object.keys(market || {}));
    console.log(`[MARKET/:id] Market ID: ${market.id}, Question: ${market.question}, QuestionID: ${market.questionID}`);
    console.log(`[MARKET/:id] Market has events:`, !!market.events, market.events?.length || 0);
    console.log(`[MARKET/:id] Market outcomes (raw):`, market.outcomes);
    console.log(`[MARKET/:id] Market outcomePrices (raw):`, market.outcomePrices);
    
    // For multi-choice markets, we need to fetch the event to get all markets (choices)
    // First, try to get the event ID from the market
    let eventId = market.questionID || market.id;
    let eventMarkets: any[] = [];
    
    // If we already found the event via Strategy 3, use those markets
    if (parentEvent && parentEvent.markets && Array.isArray(parentEvent.markets) && parentEvent.markets.length > 0) {
      eventMarkets = parentEvent.markets;
      console.log(`[MARKET/:id] Using event markets from Strategy 3: ${eventMarkets.length} markets`);
    } else {
      // Try to fetch the event data to get all markets
      try {
      // First try using the market's ID as event ID
      const eventUrl = `${GAMMA_API_BASE}/events/${eventId}`;
      let eventResponse = await fetch(eventUrl);
      
      // If that fails, try getting event from markets endpoint with question_ids
      if (!eventResponse.ok && market.questionID) {
        const marketsByQuestionUrl = `${GAMMA_API_BASE}/markets?question_ids=${encodeURIComponent(market.questionID)}`;
        const marketsResponse = await fetch(marketsByQuestionUrl);
        if (marketsResponse.ok) {
          const allMarketsForEvent = await marketsResponse.json();
          const marketsArray = Array.isArray(allMarketsForEvent) ? allMarketsForEvent : [];
          if (marketsArray.length > 0 && marketsArray[0].events && marketsArray[0].events.length > 0) {
            eventId = marketsArray[0].events[0].id || eventId;
            eventResponse = await fetch(`${GAMMA_API_BASE}/events/${eventId}`);
          } else if (marketsArray.length > 0) {
            // If we got multiple markets, they're likely all the choices for this event
            eventMarkets = marketsArray;
          }
        }
      }
      
      if (eventResponse.ok) {
        const fullEvent = await eventResponse.json();
        eventMarkets = fullEvent.markets || [];
        
        // If no markets in event, try markets array from event directly
        if (eventMarkets.length === 0 && fullEvent.markets && Array.isArray(fullEvent.markets)) {
          eventMarkets = fullEvent.markets;
        }
      } else if (market.events && Array.isArray(market.events) && market.events.length > 0) {
        // Fallback: use event data from market
        const eventData = market.events[0];
        eventMarkets = eventData.markets || [];
      }
    } catch (e) {
      console.error("Error fetching event data:", e);
      // If event fetch fails, try to get all markets with same question_ids
      if (market.questionID) {
        try {
          const marketsByQuestionUrl = `${GAMMA_API_BASE}/markets?question_ids=${encodeURIComponent(market.questionID)}`;
          const marketsResponse = await fetch(marketsByQuestionUrl);
          if (marketsResponse.ok) {
            const allMarketsForEvent = await marketsResponse.json();
            const marketsArray = Array.isArray(allMarketsForEvent) ? allMarketsForEvent : [];
            eventMarkets = marketsArray; // All markets with same question_id are the choices
            console.log(`Found ${marketsArray.length} markets for question_id ${market.questionID}`);
          }
        } catch (e2) {
          console.error("Error fetching markets by question_ids:", e2);
        }
      }
    }
    }
    
    // Parse outcomes and outcomePrices (they're JSON strings)
    let outcomes: string[] = [];
    let outcomePrices: Record<string, number> = {};
    
    console.log(`[MARKET/:id] Event markets found: ${eventMarkets.length}`);
    
    // Store both Y and N prices for each outcome (actual API data, not calculated)
    const outcomeYesPrices: Record<string, number> = {};
    const outcomeNoPrices: Record<string, number> = {};
    
    // If we have event markets, extract outcomes from all markets in the event
    if (eventMarkets.length > 0) {
      console.log(`[MARKET/:id] Processing ${eventMarkets.length} event markets`);
      // Log sample event market to see available fields
      if (eventMarkets.length > 0) {
        console.log(`[MARKET/:id] Sample event market keys:`, Object.keys(eventMarkets[0]));
        console.log(`[MARKET/:id] Sample event market clobTokenIds (raw):`, eventMarkets[0]?.clobTokenIds);
        console.log(`[MARKET/:id] Sample event market clobTokenIds type:`, typeof eventMarkets[0]?.clobTokenIds);
        // Try to parse if it's a string
        if (typeof eventMarkets[0]?.clobTokenIds === 'string') {
          try {
            const parsed = JSON.parse(eventMarkets[0].clobTokenIds);
            console.log(`[MARKET/:id] Sample event market clobTokenIds (parsed):`, parsed);
          } catch (e) {
            console.log(`[MARKET/:id] Sample event market clobTokenIds (parse failed):`, e);
          }
        }
        console.log(`[MARKET/:id] Sample event market tokens:`, eventMarkets[0]?.tokens);
      }
      // Multi-choice market - get outcomes from all markets in the event
      // Each market represents one choice (e.g., "Real Madrid") and is itself a Yes/No market
      const validOutcomes: string[] = [];
      const validEventMarkets: any[] = [];
      
      eventMarkets.forEach((m: any, index: number) => {
        // Extract outcome name from market question or groupItemTitle
        const name = m.groupItemTitle || m.question || m.title || "";
        
        // Skip placeholder outcomes like "Team A", "Team B", "Team C", etc. that have no real data
        const trimmedName = name.trim();
        const isPlaceholder = /^Team\s+[A-Z]$/i.test(trimmedName) || 
                             /^Team\s+[A-Z]\d*$/i.test(trimmedName) ||
                             (trimmedName.toLowerCase().startsWith('team ') && /^[A-Z]$/.test(trimmedName.split(/\s+/).pop() || ''));
        
        if (!name || name.trim().length === 0) {
          return; // Skip empty names
        }
        
        // Extract both Y and N prices from this market
        // Each market has outcomePrices array [Yes, No] or tokens [Yes, No]
        let yesPrice = 0;
        let noPrice = 0;
        
        // Method 1: Try outcomePrices array (JSON string or array)
        if (m.outcomePrices) {
          try {
            const prices = typeof m.outcomePrices === 'string' 
              ? JSON.parse(m.outcomePrices)
              : m.outcomePrices;
            
            if (Array.isArray(prices) && prices.length >= 2) {
              yesPrice = parseFloat(String(prices[0])) || 0;
              noPrice = parseFloat(String(prices[1])) || 0;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Method 2: Try tokens array (tokens[0] = Yes, tokens[1] = No)
        if ((yesPrice === 0 && noPrice === 0) && m.tokens && Array.isArray(m.tokens)) {
          if (m.tokens.length >= 2) {
            yesPrice = parseFloat(m.tokens[0]?.price || "0") || 0;
            noPrice = parseFloat(m.tokens[1]?.price || "0") || 0;
          } else if (m.tokens.length === 1) {
            yesPrice = parseFloat(m.tokens[0]?.price || "0") || 0;
            noPrice = 1 - yesPrice; // Fallback calculation if only one token
          }
        }
        
        // Method 3: Try lastTradePrice (Yes price) and calculate No
        if (yesPrice === 0 && m.lastTradePrice !== undefined) {
          yesPrice = parseFloat(String(m.lastTradePrice)) || 0;
          noPrice = 1 - yesPrice;
        }
        
        // Method 4: Try bestBid/bestAsk midpoint
        if (yesPrice === 0 && m.bestBid && m.bestAsk) {
          yesPrice = (parseFloat(m.bestBid) + parseFloat(m.bestAsk)) / 2;
          noPrice = 1 - yesPrice;
        }
        
        // Only include outcomes that have meaningful data (not placeholders with 0 price and 0 volume)
        const hasVolume = (m.volumeNum || parseFloat(String(m.volume || "0").replace(/[^0-9.]/g, '')) || 0) > 0;
        const hasPrice = yesPrice > 0 || noPrice > 0;
        
        if (!isPlaceholder && (hasVolume)) {
          validOutcomes.push(name);
          validEventMarkets.push(m);
          outcomeYesPrices[name] = yesPrice;
          outcomeNoPrices[name] = noPrice;
          console.log(`[MARKET/:id] Outcome "${name}" - Y: ${yesPrice}, N: ${noPrice}, Volume: ${m.volumeNum || m.volume || 0}`);
        } else {
          console.log(`[MARKET/:id] Skipping invalid/placeholder outcome: "${name}" (isPlaceholder: ${isPlaceholder}, hasPrice: ${hasPrice}, hasVolume: ${hasVolume})`);
        }
      });
      
      outcomes = validOutcomes;
      // Update eventMarkets to only include valid ones
      eventMarkets = validEventMarkets;
      
      // Store prices in outcomePrices for backward compatibility
      outcomes.forEach(name => {
        outcomePrices[name] = outcomeYesPrices[name] || 0;
      });
      
      console.log(`[MARKET/:id] Extracted ${outcomes.length} valid outcomes from ${eventMarkets.length} event markets (filtered out placeholders)`);
    } else {
      // Regular market - parse outcomes from market data
      console.log(`[MARKET/:id] No event markets, parsing from market data`);
      if (market.outcomes) {
        if (typeof market.outcomes === 'string') {
          try {
            outcomes = JSON.parse(market.outcomes);
            console.log(`[MARKET/:id] Parsed outcomes from JSON string: ${outcomes.length} outcomes`);
          } catch {
            outcomes = market.outcomes.split(',').map((o: string) => o.trim());
            console.log(`[MARKET/:id] Parsed outcomes from comma-separated: ${outcomes.length} outcomes`);
          }
        } else if (Array.isArray(market.outcomes)) {
          outcomes = market.outcomes;
          console.log(`[MARKET/:id] Outcomes from array: ${outcomes.length} outcomes`);
        }
      } else {
        console.log(`[MARKET/:id] No outcomes field in market data`);
      }
      
      if (market.outcomePrices) {
        if (typeof market.outcomePrices === 'string') {
          try {
            outcomePrices = JSON.parse(market.outcomePrices);
            console.log(`[MARKET/:id] Parsed outcomePrices from JSON string, keys:`, Object.keys(outcomePrices));
          } catch (e) {
            console.error(`[MARKET/:id] Failed to parse outcomePrices JSON:`, e);
          }
        } else if (typeof market.outcomePrices === 'object') {
          outcomePrices = market.outcomePrices;
          console.log(`[MARKET/:id] OutcomePrices from object, keys:`, Object.keys(outcomePrices));
        }
      } else {
        console.log(`[MARKET/:id] No outcomePrices field in market data`);
      }
    }
    
    console.log(`[MARKET/:id] Final outcomes count: ${outcomes.length}`);
    console.log(`[MARKET/:id] Final outcomes:`, outcomes);
    console.log(`[MARKET/:id] OutcomePrices keys:`, Object.keys(outcomePrices));

    // Build outcomes array with prices and other data
    console.log(`[MARKET/:id] Building outcomesWithData for ${outcomes.length} outcomes`);
    const outcomesWithData = outcomes.map((outcomeName: string, index: number) => {
      // Find the corresponding event market for this outcome to get oneDayPriceChange
      const eventMarket = eventMarkets.find((m: any) => 
        (m.groupItemTitle || m.question || m.title || "").trim() === outcomeName.trim()
      );
      // Get Y and N prices - use actual API data, not calculated
      let yesPrice = 0;
      let noPrice = 0;
      
      if (eventMarkets.length > 0 && eventMarkets[index]) {
        // We already extracted these from eventMarkets above
        yesPrice = outcomeYesPrices[outcomeName] || 0;
        noPrice = outcomeNoPrices[outcomeName] || 0;
      } else {
        // For regular markets, try to get from outcomePrices
        // outcomePrices might be an array [Yes, No] or object with keys
        if (market.outcomePrices) {
          try {
            const prices = typeof market.outcomePrices === 'string' 
              ? JSON.parse(market.outcomePrices)
              : market.outcomePrices;
            
            if (Array.isArray(prices)) {
              yesPrice = parseFloat(String(prices[0] || prices[index] || 0)) || 0;
              noPrice = parseFloat(String(prices[1] || prices[index + 1] || 0)) || 0;
            } else if (typeof prices === 'object') {
              // Try to find prices keyed by outcome name or index
              yesPrice = parseFloat(String(prices[outcomeName] || prices[index] || prices[`outcome${index}`] || 0)) || 0;
              noPrice = 1 - yesPrice; // Fallback calculation
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Fallback to lastTradePrice for binary markets
        if (yesPrice === 0 && market.lastTradePrice !== undefined) {
          yesPrice = parseFloat(String(market.lastTradePrice)) || 0;
          noPrice = 1 - yesPrice;
        }
      }
      
      // Get volume from event market if available
      // Use the eventMarket we found earlier, or fallback to index-based lookup
      const eventMarketForOutcome = eventMarket || eventMarkets[index];
      const outcomeVolume = eventMarketForOutcome ? (
        eventMarketForOutcome.volumeNum || 
        eventMarketForOutcome.volume || 
        market.volumeNum || 
        market.volume || 
        "0"
      ) : (market.volumeNum || market.volume || "0");
      const outcomeVolume24hrRaw = eventMarketForOutcome?.volume24hr ?? eventMarketForOutcome?.volume24hrNum ?? null;
      const outcomeVolume24hr = outcomeVolume24hrRaw ?? "0";
      
      // Get oneWeekPriceChange from event market if available
      const oneWeekPriceChange = eventMarketForOutcome?.oneWeekPriceChange ?? null;
      
      // Get liquidityClob from event market if available
      const liquidityClob = eventMarketForOutcome?.liquidityClob ?? null;
      
      // Get image from event market if available
      const outcomeImage = eventMarketForOutcome?.image || 
                          eventMarketForOutcome?.icon || 
                          market.image || 
                          market.icon || 
                          "";
      
      // Extract token IDs from event market - prioritize clobTokenIds from events API
      // clobTokenIds[0] = Yes token, clobTokenIds[1] = No token
      let yesTokenId = "";
      let noTokenId = "";
      
      // Primary: Use clobTokenIds from events API (https://gamma-api.polymarket.com/events/)
      // These are the token IDs that must be used with https://clob.polymarket.com/prices-history?market=[clobTokenIds]
      // Note: clobTokenIds can be either a JSON string or an array
      let clobTokenIdsArray: string[] = [];
      
      if (eventMarketForOutcome?.clobTokenIds) {
        if (Array.isArray(eventMarketForOutcome.clobTokenIds)) {
          clobTokenIdsArray = eventMarketForOutcome.clobTokenIds.map(String);
        } else if (typeof eventMarketForOutcome.clobTokenIds === 'string') {
          // Parse JSON string: "[\"token1\", \"token2\"]"
          try {
            clobTokenIdsArray = JSON.parse(eventMarketForOutcome.clobTokenIds).map(String);
            console.log(`[MARKET/:id] Outcome "${outcomeName}" - Parsed clobTokenIds from JSON string:`, clobTokenIdsArray);
          } catch (e) {
            console.error(`[MARKET/:id] Outcome "${outcomeName}" - Failed to parse clobTokenIds JSON:`, e);
          }
        }
        
        if (clobTokenIdsArray.length >= 2) {
          yesTokenId = clobTokenIdsArray[0] || "";
          noTokenId = clobTokenIdsArray[1] || "";
          console.log(`[MARKET/:id] Outcome "${outcomeName}" - Using clobTokenIds from events API - Yes: ${yesTokenId}, No: ${noTokenId}`);
        } else if (clobTokenIdsArray.length === 1) {
          yesTokenId = clobTokenIdsArray[0] || "";
          console.log(`[MARKET/:id] Outcome "${outcomeName}" - Only Yes Token ID from clobTokenIds: ${yesTokenId}`);
        }
      }
      
      // Fallback: Try tokens array if clobTokenIds is not available
      if ((!yesTokenId || !noTokenId) && eventMarketForOutcome?.tokens && Array.isArray(eventMarketForOutcome.tokens)) {
        if (eventMarketForOutcome.tokens.length >= 2) {
          yesTokenId = yesTokenId || String(eventMarketForOutcome.tokens[0]?.token_id || eventMarketForOutcome.tokens[0]?.id || "");
          noTokenId = noTokenId || String(eventMarketForOutcome.tokens[1]?.token_id || eventMarketForOutcome.tokens[1]?.id || "");
          console.log(`[MARKET/:id] Outcome "${outcomeName}" - Fallback to tokens array - Yes Token ID: ${yesTokenId}, No Token ID: ${noTokenId}`);
        } else if (eventMarketForOutcome.tokens.length === 1) {
          yesTokenId = yesTokenId || String(eventMarketForOutcome.tokens[0]?.token_id || eventMarketForOutcome.tokens[0]?.id || "");
          console.log(`[MARKET/:id] Outcome "${outcomeName}" - Fallback to tokens array - Only Yes Token ID found: ${yesTokenId}`);
        }
      }
      
      return {
        name: outcomeName,
        price: yesPrice, // Y price
        noPrice: noPrice, // N price (actual from API, not calculated)
        volume: typeof outcomeVolume === 'string' ? outcomeVolume : `$${Number(outcomeVolume || 0).toLocaleString()}`,
        volumeNum: typeof outcomeVolume === 'number' ? outcomeVolume : parseFloat(String(outcomeVolume).replace(/[^0-9.]/g, '')) || 0,
        volume24hr: typeof outcomeVolume24hr === 'string'
          ? outcomeVolume24hr
          : `$${Number(outcomeVolume24hr || 0).toLocaleString()}`,
        volume24hrNum: typeof outcomeVolume24hr === 'number'
          ? outcomeVolume24hr
          : parseFloat(String(outcomeVolume24hr).replace(/[^0-9.]/g, '')) || 0,
        image: outcomeImage,
        yesTokenId: yesTokenId, // Token ID for Yes outcome
        noTokenId: noTokenId, // Token ID for No outcome
        oneWeekPriceChange: oneWeekPriceChange, // Weekly price change percentage (as decimal, e.g., -0.005 = -0.5%)
        liquidityClob: liquidityClob, // CLOB liquidity from events API
      };
    });
    
    console.log(`[MARKET/:id] Built ${outcomesWithData.length} outcomes with data`);
    console.log(`[MARKET/:id] OutcomesWithData sample:`, outcomesWithData.slice(0, 3).map(o => ({ name: o.name, price: o.price })));

    // For Yes/No markets, extract prices
    let yesPrice = 0;
    let noPrice = 0;
    if (outcomesWithData.length >= 2) {
      yesPrice = outcomesWithData[0].price;
      noPrice = outcomesWithData[1].price || (1 - yesPrice);
    } else if (outcomesWithData.length === 1) {
      yesPrice = outcomesWithData[0].price;
      noPrice = 1 - yesPrice;
    } else {
      yesPrice = market.lastTradePrice || 0;
      noPrice = 1 - yesPrice;
    }

    // Use parent event's title/question if we found via events endpoint
    // This ensures multi-choice markets show the event-level question, not a specific team market
    const marketTitle = parentEvent?.question || parentEvent?.title || market.question || "";
    const marketDescription = parentEvent?.description || market.description || "";
    const marketImage = parentEvent?.image || parentEvent?.icon || market.image || market.icon || "";
    const marketCategory = parentEvent?.category || market.category || "";
    const responseMarketId = parentEvent?.id || market.id || market.questionID;

    // Extract resolver wallet from market or event data
    const resolverWallet = market.resolvedBy ||
                          parentEvent?.resolvedBy ||
                          market.resolver || 
                          market.resolverAddress || 
                          market.resolverWallet ||
                          parentEvent?.resolver ||
                          parentEvent?.resolverAddress ||
                          parentEvent?.resolverWallet ||
                          market.condition?.resolver ||
                          "";

    const responseData = {
      success: true,
      market: {
        id: responseMarketId,
        title: marketTitle,
        description: marketDescription,
        category: marketCategory,
        image: marketImage,
        slug: market.slug || "",
        yesPrice: yesPrice,
        noPrice: noPrice,
        volume: market.volume || "$0",
        volumeNum: market.volumeNum || 0,
        liquidity: market.liquidity || "$0",
        liquidityNum: market.liquidityNum || 0,
        endDate: market.endDateIso || market.endDate || "",
        startDate: market.startDateIso || market.startDate || "",
        createdAt: market.createdAt || "",
        active: market.active || false,
        closed: market.closed || false,
        bestBid: market.bestBid || 0,
        bestAsk: market.bestAsk || 0,
        lastTradePrice: market.lastTradePrice || 0,
        change: market.oneDayPriceChange ? `${market.oneDayPriceChange >= 0 ? '+' : ''}${market.oneDayPriceChange.toFixed(2)}%` : "0%",
        hourlyChange: market.oneHourPriceChange ? `${market.oneHourPriceChange >= 0 ? '+' : ''}${market.oneHourPriceChange.toFixed(2)}%` : "0%",
        weeklyChange: market.oneWeekPriceChange ? `${market.oneWeekPriceChange >= 0 ? '+' : ''}${market.oneWeekPriceChange.toFixed(2)}%` : "0%",
        monthlyChange: market.oneMonthPriceChange ? `${market.oneMonthPriceChange >= 0 ? '+' : ''}${market.oneMonthPriceChange.toFixed(2)}%` : "0%",
        outcomes: outcomes,
        topOutcomes: outcomesWithData, // ALL outcomes with full data (not just top 2)
        outcomePrices: outcomePrices, // Include raw outcomePrices for reference
        eventMarkets: eventMarkets.length > 0 ? eventMarkets.length : undefined, // Debug: number of event markets found
        isYesNo: outcomes.length === 2 && 
                 outcomes.some((o: string) => o.toLowerCase().includes('yes')) &&
                 outcomes.some((o: string) => o.toLowerCase().includes('no')),
        resolverWallet: resolverWallet, // Resolver wallet address
      }
    };
    
    console.log(`[MARKET/:id] Returning market data:`);
    console.log(`[MARKET/:id] - Market ID: ${responseData.market.id}`);
    console.log(`[MARKET/:id] - Title: ${responseData.market.title}`);
    console.log(`[MARKET/:id] - Outcomes count: ${responseData.market.outcomes.length}`);
    console.log(`[MARKET/:id] - TopOutcomes count: ${responseData.market.topOutcomes.length}`);
    console.log(`[MARKET/:id] - IsYesNo: ${responseData.market.isYesNo}`);
    console.log(`[MARKET/:id] - TopOutcomes:`, responseData.market.topOutcomes.map((o: any) => ({ name: o.name, price: o.price, volume: o.volume })));
    
    return c.json(responseData);
  } catch (error: any) {
    console.error("Error fetching market:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to fetch market"
    }, 500);
  }
});

// Get price history by token ID
polymarketRouter.get("/markets/:id/history", async (c) => {
  try {
    const marketId = c.req.param("id");
    const tokenId = c.req.query("tokenId"); // Token ID for the specific outcome (Yes or No)
    const interval = c.req.query("interval") || "MAX";
    
    console.log(`[PRICE-HISTORY] Fetching history for marketId: ${marketId}, tokenId: ${tokenId || 'not provided'}, interval: ${interval}`);
    
    let finalTokenId = tokenId;
    
    // If tokenId is provided, use it directly
    if (finalTokenId) {
      console.log(`[PRICE-HISTORY] Using provided tokenId: ${finalTokenId}`);
    } else {
      // Otherwise, try to get token ID from CLOB API (fallback for old markets)
      console.log(`[PRICE-HISTORY] No tokenId provided, trying to fetch from CLOB API for marketId: ${marketId}`);
    const marketUrl = `${CLOB_API_BASE}/markets?question_id=${marketId}&limit=1`;
    const marketResponse = await fetch(marketUrl);
    
    if (!marketResponse.ok) {
        console.error(`[PRICE-HISTORY] Failed to fetch market: ${marketResponse.status}`);
      throw new Error(`Failed to fetch market: ${marketResponse.status}`);
    }
    
    const marketData = await marketResponse.json();
    const markets = marketData.data || marketData || [];
    
    if (markets.length === 0 || !markets[0].tokens || markets[0].tokens.length === 0) {
        console.log(`[PRICE-HISTORY] No markets or tokens found`);
      return c.json({ success: true, history: [] });
    }

      finalTokenId = markets[0].tokens[0].token_id;
      console.log(`[PRICE-HISTORY] Found token ID from CLOB API: ${finalTokenId}`);
    }
    
    if (!finalTokenId) {
      console.log(`[PRICE-HISTORY] No token ID available`);
      return c.json({ success: true, history: [] });
    }
    
    // Map interval to API format
    const intervalMap: Record<string, string> = {
      "1H": "1h",
      "6H": "6h",
      "1D": "1d",
      "1W": "1w",
      "1M": "1m",
      "MAX": "max"
    };
    
    // Map interval to fidelity (minutes) based on interval
    const fidelityMap: Record<string, number> = {
      "1H": 1,
      "6H": 5,
      "1D": 15,
      "1W": 60,
      "1M": 720,
      "MAX": 720
    };
    
    const fidelity = fidelityMap[interval] || 720;
    const intervalParam = intervalMap[interval] || "max";
    
    // Build URL with market parameter (clobTokenIds from events API) and fidelity
    // Format: https://clob.polymarket.com/prices-history?market=[clobTokenIds]&interval=max&fidelity=720
    const historyUrl = `${CLOB_API_BASE}/prices-history?market=${finalTokenId}&interval=${intervalParam}&fidelity=${fidelity}`;
    console.log(`[PRICE-HISTORY] Fetching from: ${historyUrl}`);
    console.log(`[PRICE-HISTORY] Using clobTokenIds from events API: ${finalTokenId}`);
    
    const historyResponse = await fetch(historyUrl);
    
    if (!historyResponse.ok) {
      console.error(`[PRICE-HISTORY] Failed to fetch history: ${historyResponse.status}`);
      return c.json({ success: true, history: [] });
    }

    const historyData = await historyResponse.json();
    const history = historyData.history || [];
    
    console.log(`[PRICE-HISTORY] Received ${history.length} history points`);
    
    const transformedHistory = history.map((point: any) => ({
      timestamp: point.t,
      price: point.p,
      date: new Date(point.t * 1000).toISOString()
    }));
    
    return c.json({
      success: true,
      history: transformedHistory
    });
  } catch (error: any) {
    console.error("[PRICE-HISTORY] Error fetching price history:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to fetch price history",
      history: []
    });
  }
});

// Get categories
polymarketRouter.get("/categories", async (c) => {
  try {
    // Get categories from Gamma API
    const tagsUrl = `${GAMMA_API_BASE}/tags`;
    const tagsResponse = await fetch(tagsUrl);
    
    let categories = ["All"];
    
    if (tagsResponse.ok) {
      const tagsData = await tagsResponse.json();
      const tags = tagsData.data || tagsData || [];
      // Filter to common categories
      const commonCategories = ["Politics", "Sports", "Finance", "Crypto", "Geopolitics", "Earnings", "Tech", "Culture", "World", "Economy", "Elections"];
      categories = ["All", ...commonCategories.filter(cat => 
        tags.some((tag: any) => tag.name === cat || tag === cat)
      )];
    } else {
      // Fallback categories
      categories = [
        "All", "Politics", "Sports", "Finance", "Crypto", "Geopolitics",
        "Earnings", "Tech", "Culture", "World", "Economy", "Elections"
      ];
    }

    return c.json({
      success: true,
      categories
    });
  } catch (error) {
    return c.json({
      success: false,
      error: "Failed to fetch categories",
      categories: ["All", "Politics", "Sports", "Finance", "Crypto", "Geopolitics", "Earnings", "Tech", "Culture", "World", "Economy", "Elections"]
    }, 500);
  }
});

// Leaderboard endpoint
polymarketRouter.get("/leaderboard", async (c) => {
  try {
    const timeframe = c.req.query("timeframe") || "all";
    const limit = parseInt(c.req.query("limit") || "50");
    
    let apiUrl = `${DATA_API_BASE}/v1/leaderboard`;
    const params = new URLSearchParams();
    
    const timePeriodMap: Record<string, string> = {
      "day": "day",
      "week": "week",
      "month": "month",
      "all": "all"
    };
    
    if (timePeriodMap[timeframe]) {
      params.set("timePeriod", timePeriodMap[timeframe]);
    }
    
    params.set("orderBy", "PNL");
    params.set("limit", limit.toString());
    params.set("offset", "0");
    
    apiUrl += "?" + params.toString();
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Leaderboard API error: ${response.status}`);
    }
    
    const apiData = await response.json() as any[];
    
    const leaderboard = apiData.slice(0, limit).map((trader: any, index: number) => {
      const totalVolume = parseFloat(trader.vol) || 0;
      const totalProfit = parseFloat(trader.pnl) || 0;
      const roiPercentage = totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0;
      
      return {
        rank: parseInt(trader.rank) || index + 1,
        username: trader.userName || trader.proxyWallet?.slice(0, 10) || "Anonymous",
        address: trader.proxyWallet || "",
        totalVolume: Math.floor(totalVolume),
        totalProfit: Math.floor(totalProfit),
        roiPercentage: Math.round(roiPercentage * 10) / 10,
        avatar: trader.profileImage || undefined,
        accuracy: 0,
        marketsTraded: 0,
        winStreak: 0,
        totalTrades: 0,
        avgPositionSize: 0,
        activeMarkets: 0,
        lastActiveDate: ""
      };
    });
    
    return c.json({
      success: true,
      leaderboard: leaderboard,
      timeframe: timeframe,
      total: leaderboard.length
    });
  } catch (error: any) {
    console.error("Error fetching leaderboard:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to fetch leaderboard",
      leaderboard: []
    }, 500);
  }
});

// Base URLs for subgraphs
const ORDERS_SUBGRAPH = "https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/orderbook-subgraph/0.0.1/gn";
const OPEN_INTEREST_SUBGRAPH = "https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/oi-subgraph/0.0.6/gn";
const ACTIVITY_SUBGRAPH = "https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/activity-subgraph/0.0.4/gn";

/**
 * Get markets from Polymarket subgraphs (GraphQL)
 * Uses Orders subgraph for prices and Open Interest for volume
 */
// Cache for subgraph markets
const subgraphCache = new Map<string, { data: any; timestamp: number }>();

polymarketRouter.get("/markets-subgraph", async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query("limit") || "200"), 500); // Cap at 500 for performance
    const offset = parseInt(c.req.query("offset") || "0");
    const tagSlug = c.req.query("tagSlug"); // Optional tag slug for filtering by category

    // Create cache key
    const cacheKey = `subgraph:${limit}:${tagSlug || 'all'}:${offset}`;
    const cached = subgraphCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return c.json(cached.data);
    }

    // console.log(`[SUBGRAPH] Fetching markets with limit=${limit}, offset=${offset}, tagSlug=${tagSlug || "none"}`);

    // Use /events/pagination endpoint with exact structure as specified
    // Format: limit=50&active=true&archived=false&closed=false&order=volume&ascending=false&offset=0
    // If tagSlug is provided, add it: &tag_slug=politics
    let gammaUrl = `${GAMMA_API_BASE}/events/pagination?limit=${limit}&active=true&archived=false&closed=false&order=volume&ascending=false&offset=${offset}`;
    if (tagSlug) {
      gammaUrl += `&tag_slug=${encodeURIComponent(tagSlug)}`;
    }
    
    // console.log(`[SUBGRAPH] Gamma API URL: ${gammaUrl}`);
    const gammaResponse = await fetch(gammaUrl);
    
    if (!gammaResponse.ok) {
      throw new Error(`Gamma API error: ${gammaResponse.status}`);
    }

    const gammaData = await gammaResponse.json();
    
    // API response structure: { "data": [...events...], "pagination": {...} }
    // Each event contains a "markets" array - these are actually choices within the event
    // We want to show EVENTS as markets, not individual choice markets
    let events: any[] = [];
    if (gammaData.data && Array.isArray(gammaData.data)) {
      events = gammaData.data;
    } else if (Array.isArray(gammaData)) {
      events = gammaData;
    }
    
    // Removed verbose logging
    
    // Filter out resolved/closed events
    events = events.filter((event: any) => {
      // Remove closed events
      if (event.closed === true) {
        return false;
      }
      
      // Remove archived events
      if (event.archived === true) {
        return false;
      }
      
      // Remove events with no active markets
      if (!event.markets || !Array.isArray(event.markets) || event.markets.length === 0) {
        return false;
      }
      
      // Filter out markets (choices) within the event that are resolved
      const activeMarkets = event.markets.filter((market: any) => {
        // Remove closed markets
        if (market.closed === true) {
          return false;
        }
        
        // Remove archived markets
        if (market.archived === true) {
          return false;
        }
        
        // Remove markets where prices indicate resolution (0/1 or 1/0)
        if (market.outcomePrices) {
          try {
            const prices = typeof market.outcomePrices === 'string' 
              ? JSON.parse(market.outcomePrices) 
              : market.outcomePrices;
            if (Array.isArray(prices)) {
              const hasOne = prices.some((p: number) => Math.abs(p - 1) < 0.001);
              const hasZero = prices.some((p: number) => Math.abs(p - 0) < 0.001);
              if (hasOne && hasZero) {
                return false; // Market is resolved
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        return true;
      });
      
      // Only keep events that have at least one active market
      if (activeMarkets.length === 0) {
        return false;
      }
      
      // Update event markets to only active ones
      event.markets = activeMarkets;
      return true;
    });
    
    // Removed verbose logging
    
    // Collect all condition IDs from all markets in all events for subgraph queries
    const allConditionIds: string[] = [];
    events.forEach((event: any) => {
      if (event.markets && Array.isArray(event.markets)) {
        event.markets.forEach((market: any) => {
          const conditionId = market.conditionId || market.id;
          if (conditionId && conditionId.startsWith('0x')) {
            allConditionIds.push(conditionId);
          }
        });
      }
    });
    
    // Removed verbose logging

    if (events.length === 0) {
      return c.json({
        success: true,
        markets: [],
        total: 0
      });
    }

    if (allConditionIds.length === 0) {
      console.warn(`[SUBGRAPH] No valid condition IDs found`);
    }

    // Query Orders subgraph for prices (best bid/ask)
    const ordersQuery = `
      query GetMarketPrices($conditionIds: [String!]!) {
        markets(where: { conditionId_in: $conditionIds }, first: 1000) {
          conditionId
          questionId
          outcomeTokenAmounts
          outcomeTokenPrices
          bestBid
          bestAsk
          totalBidLiquidity
          totalAskLiquidity
        }
      }
    `;

    // Query Open Interest subgraph for volume
    const openInterestQuery = `
      query GetMarketVolume($conditionIds: [String!]!) {
        markets(where: { conditionId_in: $conditionIds }, first: 1000) {
          conditionId
          questionId
          volume24h
          volume7d
          volume30d
          totalVolume
          openInterest
        }
      }
    `;

    let ordersData: any = {};
    let volumeData: any = {};

    try {
      // Fetch orders data in batches (GraphQL might have limits) - increased batch size for fewer requests
      const batchSize = 200; // Increased from 100 to reduce number of requests
      
      // Create all batch requests for parallel execution
      const ordersBatches: Promise<Response | null>[] = [];
      const volumeBatches: Promise<Response | null>[] = [];
      for (let i = 0; i < allConditionIds.length; i += batchSize) {
        const batch = allConditionIds.slice(i, i + batchSize);
        
        ordersBatches.push(
          fetch(ORDERS_SUBGRAPH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: ordersQuery,
              variables: { conditionIds: batch }
            })
          }).catch(() => null)
        );
        
        volumeBatches.push(
          fetch(OPEN_INTEREST_SUBGRAPH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: openInterestQuery,
              variables: { conditionIds: batch }
            })
          }).catch(() => null)
        );
      }
      
      // Fetch all batches in parallel
      const [ordersResults, volumeResults] = await Promise.all([
        Promise.all(ordersBatches),
        Promise.all(volumeBatches)
      ]);
      
      // Process orders results
      for (const ordersResponse of ordersResults) {
        if (ordersResponse && ordersResponse.ok) {
          try {
            const ordersResult = await ordersResponse.json();
            if (ordersResult.data?.markets) {
              ordersResult.data.markets.forEach((market: any) => {
                ordersData[market.conditionId] = market;
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      
      // Process volume results
      for (const volumeResponse of volumeResults) {
        if (volumeResponse && volumeResponse.ok) {
          try {
            const volumeResult = await volumeResponse.json();
            if (volumeResult.data?.markets) {
              volumeResult.data.markets.forEach((market: any) => {
                volumeData[market.conditionId] = market;
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } catch (subgraphError) {
      // Silently handle errors - we'll use fallback data
    }

    // Transform events into markets with top 2 choices
    const transformedMarkets = events.map((event: any) => {
      // Get all markets (choices) within this event with their prices
      const choicesWithPrices = event.markets.map((choiceMarket: any) => {
        const conditionId = choiceMarket.conditionId || choiceMarket.id;
        const orders = ordersData[conditionId];
        const volume = volumeData[conditionId];

        // Extract "Yes" price (first outcome price) from orders subgraph or fallbacks
        let yesPrice = 0;
        let noPrice = 0;
        
        if (orders?.outcomeTokenPrices && Array.isArray(orders.outcomeTokenPrices)) {
          yesPrice = parseFloat(orders.outcomeTokenPrices[0]) || 0;
          noPrice = parseFloat(orders.outcomeTokenPrices[1]) || (1 - yesPrice);
        } else if (choiceMarket.outcomePrices) {
          try {
            const prices = typeof choiceMarket.outcomePrices === 'string' 
              ? JSON.parse(choiceMarket.outcomePrices) 
              : choiceMarket.outcomePrices;
            if (Array.isArray(prices) && prices.length >= 2) {
              yesPrice = parseFloat(String(prices[0])) || 0;
              noPrice = parseFloat(String(prices[1])) || (1 - yesPrice);
            }
          } catch (e) {
            // Ignore parse errors
          }
        } else if (orders?.bestBid && orders?.bestAsk) {
          const midPrice = (parseFloat(orders.bestBid) + parseFloat(orders.bestAsk)) / 2;
          yesPrice = midPrice;
          noPrice = 1 - midPrice;
        } else if (choiceMarket.lastTradePrice !== undefined) {
          yesPrice = parseFloat(String(choiceMarket.lastTradePrice)) || 0;
          noPrice = 1 - yesPrice;
        }

        // Extract choice name from market question
        // Example: "Will the Arizona Cardinals win Super Bowl 2026?" -> "Arizona Cardinals"
        let choiceName = choiceMarket.question || choiceMarket.groupItemTitle || "";
        // Try to extract the team/choice name from patterns like "Will the X win Y?"
        const match = choiceName.match(/Will (?:the )?(.+?)(?: win | is | be )/i);
        if (match && match[1]) {
          choiceName = match[1].trim();
        } else if (choiceMarket.groupItemTitle) {
          choiceName = choiceMarket.groupItemTitle;
        }

        return {
          conditionId,
          name: choiceName,
          yesPrice,
          noPrice,
          volume: volume?.totalVolume ? parseFloat(String(volume.totalVolume)) : (choiceMarket.volumeNum || 0),
          marketData: choiceMarket
        };
      });

      // Sort by yes price (highest first) to get most likely choices
      choicesWithPrices.sort((a, b) => b.yesPrice - a.yesPrice);
      
      // Get top 2 choices
      const topChoices = choicesWithPrices.slice(0, 2);

      // Calculate total volume for the event (sum of all choice volumes or use event volume)
      let volumeNum = 0;
      if (event.volume && typeof event.volume === 'number') {
        volumeNum = event.volume;
      } else if (event.volume) {
        const volStr = String(event.volume || "0");
        volumeNum = parseFloat(volStr.replace(/[^0-9.]/g, "")) || 0;
      } else {
        // Sum volumes from all choices
        volumeNum = choicesWithPrices.reduce((sum, choice) => sum + (choice.volume || 0), 0);
      }

      // Get 24hr volume from subgraph data (sum from all choices or use event volume24h)
      let volume24hrNum = 0;
      if (event.volume24h !== undefined && event.volume24h !== null) {
        volume24hrNum = parseFloat(String(event.volume24h)) || 0;
      } else if (event.volume24hr !== undefined && event.volume24hr !== null) {
        volume24hrNum = parseFloat(String(event.volume24hr)) || 0;
      } else {
        // Sum 24hr volumes from all choices
        choicesWithPrices.forEach(choice => {
          const choiceVolume = volumeData[choice.conditionId];
          if (choiceVolume?.volume24h !== undefined && choiceVolume.volume24h !== null) {
            volume24hrNum += parseFloat(String(choiceVolume.volume24h)) || 0;
          } else if (choiceVolume?.volume24hr !== undefined && choiceVolume.volume24hr !== null) {
            volume24hrNum += parseFloat(String(choiceVolume.volume24hr)) || 0;
          }
        });
      }

      // Format all-time volume for display
      let volumeDisplay = "$0";
      if (volumeNum >= 1000000) {
        volumeDisplay = `$${(volumeNum / 1000000).toFixed(1)}M`;
      } else if (volumeNum >= 1000) {
        volumeDisplay = `$${(volumeNum / 1000).toFixed(1)}K`;
      } else if (volumeNum > 0) {
        volumeDisplay = `$${volumeNum.toFixed(0)}`;
      }

      // Format 24hr volume for display
      let volume24hrDisplay = "$0";
      if (volume24hrNum >= 1000000) {
        volume24hrDisplay = `$${(volume24hrNum / 1000000).toFixed(1)}M`;
      } else if (volume24hrNum >= 1000) {
        volume24hrDisplay = `$${(volume24hrNum / 1000).toFixed(1)}K`;
      } else if (volume24hrNum > 0) {
        volume24hrDisplay = `$${volume24hrNum.toFixed(0)}`;
      }

      // Extract category from event tags
      const tags = event.tags || [];
      let categoryFromTags = "Other";
      if (tags.length > 0) {
        if (typeof tags[0] === 'object' && tags[0] !== null) {
          const categoryTag = tags.find((tag: any) => 
            ["Politics", "Sports", "Finance", "Crypto", "Geopolitics", "Earnings", "Tech", "Culture", "World", "Economy", "Elections"].includes(tag.label || tag.name || "")
          ) || tags[0];
          categoryFromTags = categoryTag.label || categoryTag.name || categoryTag.slug || "Other";
        } else {
          categoryFromTags = tags.find((tag: string) => 
            ["Politics", "Sports", "Finance", "Crypto", "Geopolitics", "Earnings", "Tech", "Culture", "World", "Economy", "Elections"].includes(tag)
          ) || tags[0] || "Other";
        }
      }

      // This is NOT a Yes/No market - it's a multi-choice market
      const isYesNo = false;
      
      // Determine if event is trending (high volume) or new
      const isTrending = volumeNum > 10000;
      const isNew = event.new === true || (event.creationDate && new Date(event.creationDate).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000);
      const isFeatured = event.featured === true;
      
      return {
        id: event.id || event.slug || "",
        title: event.title || event.ticker || "",
        category: categoryFromTags,
        slug: event.slug || "",
        image: event.image || event.icon || "",
        description: event.description || "",
        yesPrice: topChoices[0]?.yesPrice || 0,
        noPrice: topChoices[0]?.noPrice || 0,
        volume: volumeDisplay,
        volumeNum: volumeNum,
        volume24hr: volume24hrDisplay,
        volume24hrNum: volume24hrNum,
        change: "0%", // Events don't have price changes
        trending: isTrending,
        new: isNew,
        featured: isFeatured,
        endDate: event.endDate || event.endDateIso || "",
        liquidity: "$0",
        lastPrice: topChoices[0]?.yesPrice || 0,
        bestBid: 0,
        bestAsk: 0,
        hourlyChange: "0%",
        weeklyChange: "0%",
        monthlyChange: "0%",
        outcomes: [], // Not applicable for event-based markets
        topOutcomes: topChoices.map(choice => ({
          name: choice.name,
          price: choice.yesPrice,
          noPrice: choice.noPrice
        })),
        isYesNo: isYesNo,
        active: event.active !== false,
        acceptingOrders: true
      };
    }).filter((m: any) => m !== null && m.topOutcomes && m.topOutcomes.length > 0);

    const response = {
      success: true,
      markets: transformedMarkets,
      total: transformedMarkets.length
    };
    
    // Cache the response
    subgraphCache.set(cacheKey, { data: response, timestamp: Date.now() });
    
    // Clean up old cache entries (keep last 50)
    if (subgraphCache.size > 50) {
      const oldestKey = Array.from(subgraphCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
      if (oldestKey) subgraphCache.delete(oldestKey);
    }
    
    return c.json(response);
  } catch (error: any) {
    console.error("[SUBGRAPH] Global error in /markets-subgraph endpoint:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to fetch markets from subgraph",
      markets: [],
      total: 0
    }, 500);
  }
});

// Base URLs for user profile APIs
const POLYMARKET_API_BASE = "https://polymarket.com/api";
const USER_PNL_API_BASE = "https://user-pnl-api.polymarket.com";

/**
 * Get user profile data including performance stats and positions
 */
polymarketRouter.get("/user/:address/profile", async (c) => {
  try {
    const address = c.req.param("address");
    const timeframe = c.req.query("timeframe") || "1M"; // 1D, 1W, 1M, ALL
    
    if (!address || !address.startsWith('0x')) {
      return c.json({
        success: false,
        error: "Invalid user address",
        profile: null
      }, 400);
    }

    console.log(`[USER PROFILE] Fetching profile for address: ${address}, timeframe: ${timeframe}`);

    // Fetch userData first to get username for stats endpoint
    let userData: any = null;
    try {
      const userDataResponse = await fetch(`${POLYMARKET_API_BASE}/profile/userData?address=${address}`);
      if (userDataResponse.ok) {
        userData = await userDataResponse.json();
      }
    } catch (e) {
      console.log(`[USER PROFILE] Failed to fetch userData:`, e);
    }
    
    const username = userData?.username || userData?.name || "";

    // Fetch data from multiple APIs in parallel
    const [
      userValueRes,
      userStatsRes,
      positionsRes,
      closedPositionsRes,
      activityRes,
      pnlHistoryRes
    ] = await Promise.allSettled([
      fetch(`${DATA_API_BASE}/value?user=${address}`),
      fetch(`${POLYMARKET_API_BASE}/profile/stats?proxyAddress=${address}${username ? `&username=${username}` : ''}`),
      fetch(`${DATA_API_BASE}/positions?user=${address}&sortBy=CURRENT&sortDirection=DESC&sizeThreshold=.1&limit=50&offset=0`),
      fetch(`${DATA_API_BASE}/closed-positions?user=${address}&sortBy=realizedpnl&sortDirection=DESC&limit=25&offset=0`),
      fetch(`${DATA_API_BASE}/activity?user=${address}&limit=25&offset=0`),
      (() => {
        // Adjust interval and fidelity based on timeframe
        let interval = "1m";
        let fidelity = "1d";
        
        if (timeframe === "1D") {
          interval = "1m";
          fidelity = "1h";
        } else if (timeframe === "1W") {
          interval = "1m";
          fidelity = "1h"; // Use 1h fidelity like 1D to ensure API call succeeds
        } else if (timeframe === "1M") {
          interval = "1m";
          fidelity = "1d";
        } else if (timeframe === "ALL") {
          // For ALL, use interval=all to get all-time historical data
          interval = "all";
          fidelity = "1d"; // Use daily fidelity - valid values: '1d', '18h', '12h', '3h', '1h'
        }
        
        const apiUrl = `${USER_PNL_API_BASE}/user-pnl?user_address=${address}&interval=${interval}&fidelity=${fidelity}`;
        console.log(`[USER PROFILE] Fetching PNL history for timeframe ${timeframe}:`, apiUrl);
        return fetch(apiUrl);
      })()
    ]);

    // Parse responses
    let userValue: any = null;
    let userStats: any = null;
    let positions: any[] = [];
    let closedPositions: any[] = [];
    let activities: any[] = [];
    let pnlHistory: any[] = [];
    
    if (userValueRes.status === 'fulfilled' && userValueRes.value.ok) {
      const userValueData = await userValueRes.value.json();
      // The API returns an array with an object containing user and value
      if (Array.isArray(userValueData) && userValueData.length > 0) {
        userValue = userValueData[0];
      } else {
        userValue = userValueData;
      }
    }
    
    if (userStatsRes.status === 'fulfilled' && userStatsRes.value.ok) {
      userStats = await userStatsRes.value.json();
    }
    
    if (positionsRes.status === 'fulfilled' && positionsRes.value.ok) {
      const positionsData = await positionsRes.value.json();
      positions = Array.isArray(positionsData) ? positionsData : (positionsData.positions || positionsData.data || []);
    }
    
    if (closedPositionsRes.status === 'fulfilled' && closedPositionsRes.value.ok) {
      const closedData = await closedPositionsRes.value.json();
      closedPositions = Array.isArray(closedData) ? closedData : (closedData.positions || closedData.data || []);
    }
    
    if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
      const activityData = await activityRes.value.json();
      activities = Array.isArray(activityData) ? activityData : (activityData.activity || activityData.data || []);
    }
    
    if (pnlHistoryRes.status === 'fulfilled' && pnlHistoryRes.value.ok) {
      const pnlData = await pnlHistoryRes.value.json();
      console.log(`[USER PROFILE] PNL history API response for timeframe ${timeframe}:`, {
        isArray: Array.isArray(pnlData),
        length: Array.isArray(pnlData) ? pnlData.length : 0,
        firstItem: Array.isArray(pnlData) && pnlData.length > 0 ? pnlData[0] : null,
        rawData: pnlData
      });
      
      // The API returns array of {t: timestamp in seconds, p: pnl value}
      if (Array.isArray(pnlData) && pnlData.length > 0 && pnlData[0].t !== undefined) {
        // Transform from {t, p} format to our internal format
        pnlHistory = pnlData.map((item: any) => ({
          timestamp: item.t * 1000, // Convert seconds to milliseconds
          cumulativePnl: item.p || 0,
          date: new Date(item.t * 1000).toISOString()
        }));
        console.log(`[USER PROFILE] Transformed PNL history:`, {
          length: pnlHistory.length,
          firstPoint: pnlHistory[0] ? { timestamp: new Date(pnlHistory[0].timestamp).toISOString(), pnl: pnlHistory[0].cumulativePnl } : null,
          lastPoint: pnlHistory[pnlHistory.length - 1] ? { timestamp: new Date(pnlHistory[pnlHistory.length - 1].timestamp).toISOString(), pnl: pnlHistory[pnlHistory.length - 1].cumulativePnl } : null
        });
      } else {
        // Fallback for other formats
      pnlHistory = Array.isArray(pnlData) ? pnlData : (pnlData.data || pnlData.history || []);
        console.log(`[USER PROFILE] Using fallback PNL history format:`, {
          length: pnlHistory.length
        });
      }
    } else {
      console.log(`[USER PROFILE] PNL history fetch failed:`, {
        status: pnlHistoryRes.status,
        ok: pnlHistoryRes.status === 'fulfilled' ? pnlHistoryRes.value.ok : false,
        statusText: pnlHistoryRes.status === 'fulfilled' ? pnlHistoryRes.value.statusText : undefined,
        statusCode: pnlHistoryRes.status === 'fulfilled' ? pnlHistoryRes.value.status : undefined,
        url: pnlHistoryRes.status === 'fulfilled' ? pnlHistoryRes.value.url : undefined
      });
      
      // Try to get error details
      if (pnlHistoryRes.status === 'fulfilled') {
        try {
          const errorText = await pnlHistoryRes.value.text();
          console.log(`[USER PROFILE] PNL history error response:`, errorText);
        } catch (e) {
          console.log(`[USER PROFILE] Could not read error response:`, e);
        }
      }
    }

    // Extract username from userData or userStats (username already fetched above, but update with stats if available)
    const finalUsername = userData?.username || userStats?.username || userData?.name || username || address.slice(0, 8) + "...";
    const avatar = userData?.avatar || userData?.profileImage || userStats?.avatar || undefined;

    // Calculate totals from positions and stats
    const totalPnl = userValue?.totalPnl || userStats?.totalPnl || userData?.totalPnl || 0;
    const totalVolume = userStats?.totalVolume || userData?.totalVolume || userValue?.totalVolume || 0;
    // Extract total value from the value API response
    const totalValue = userValue?.value || 0;
    
    // Transform positions - use PNL directly from API
    const transformedPositions = positions.map((pos: any) => {
      const marketId = pos.marketId || pos.conditionId || pos.id || "";
      // Try many possible fields for market title
      const marketTitle = pos.marketTitle || 
                         pos.market?.title || 
                         pos.market?.question ||
                         pos.event?.title || 
                         pos.event?.question ||
                         pos.question || 
                         pos.event?.question || 
                         pos.name || 
                         pos.title ||
                         pos.market?.name ||
                         "";
      
      // Log if title is missing to help debug
      if (!marketTitle && marketId) {
        console.log(`[USER PROFILE] Missing market title for position. MarketId: ${marketId}, Available fields:`, Object.keys(pos));
      }
      
      // Extract shares and average price first
      const shares = parseFloat(pos.shares || pos.size || pos.amount || "0");
      const avgPrice = parseFloat(pos.avgPrice || pos.averagePrice || pos.avg || "0");
      
      // Use API fields directly
      const currentPrice = parseFloat(pos.curPrice || pos.currentPrice || pos.current || pos.price || "0");
      const value = parseFloat(pos.currentValue || pos.value || pos.positionValue || pos.totalValue || "0");
      const unrealizedPnl = parseFloat(pos.cashPnl || pos.unrealizedPnl || pos.unrealizedPnL || pos.pnl || "0");
      const percentPnl = parseFloat(pos.percentPnl || pos.pnlPercent || "0");
      
      return {
        marketId: marketId,
        marketTitle: marketTitle,
      outcome: pos.outcome || pos.outcomeToken || "",
        shares: shares,
        avgPrice: avgPrice,
        currentPrice: currentPrice,
        unrealizedPnl: unrealizedPnl,
        value: value,
        percentPnl: percentPnl,
        image: pos.market?.image || pos.image || pos.market?.icon || pos.icon || pos.event?.image || pos.event?.icon || ""
      };
    });

    // Transform closed positions - use realized PNL directly from API
    const transformedClosedPositions = closedPositions.map((pos: any) => {
      const marketId = pos.marketId || pos.conditionId || pos.id || "";
      // Try many possible fields for market title
      const marketTitle = pos.marketTitle || 
                         pos.market?.title || 
                         pos.market?.question ||
                         pos.event?.title || 
                         pos.event?.question ||
                         pos.question || 
                         pos.event?.question || 
                         pos.name || 
                         pos.title ||
                         pos.market?.name ||
                         "";
      
      // Extract shares and average price first
      const shares = parseFloat(pos.shares || pos.size || pos.amount || "0");
      const avgPrice = parseFloat(pos.avgPrice || pos.averagePrice || pos.avg || "0");
      
      // Get current/exit price for closed positions
      const currentPrice = parseFloat(
        pos.exitPrice ||
        pos.currentPrice || 
        pos.current || 
        pos.price || 
        pos.market?.currentPrice ||
        pos.outcomeToken?.price ||
        pos.token?.price ||
        "0"
      );
      
      // Calculate value: shares * currentPrice
      const calculatedValue = shares * currentPrice;
      const value = parseFloat(
        pos.value || 
        pos.positionValue || 
        pos.totalValue ||
        calculatedValue.toString()
      );
      
      // Calculate cost basis
      const costBasis = shares * avgPrice;
      
      // Use realized PNL directly from API - try multiple possible field names
      const realizedPnl = parseFloat(
        pos.realizedPnl || 
        pos.realizedPnL ||
        pos.realizedPnlNum ||
        pos.unrealizedPnl || 
        pos.unrealizedPnL || 
        pos.unrealizedPnlNum ||
        pos.pnl || 
        pos.pnlNum ||
        pos.profitLoss ||
        pos.profitLossNum ||
        (value && costBasis ? (value - costBasis) : null) ||
        "0"
      );
      
      return {
        marketId: marketId,
        marketTitle: marketTitle,
        outcome: pos.outcome || pos.outcomeToken || "",
        shares: shares,
        avgPrice: avgPrice,
        currentPrice: currentPrice,
        unrealizedPnl: realizedPnl, // For closed positions, this is actually realized PnL
        value: value,
        image: pos.market?.image || pos.image || pos.market?.icon || pos.icon || pos.event?.image || pos.event?.icon || ""
      };
    });

    // Transform activities
    const transformedActivities = activities.slice(0, 25).map((act: any, index: number) => ({
      id: act.id || act.txHash || `act-${index}`,
      type: (act.side || act.type || act.action || "buy").toLowerCase() as "buy" | "sell",
      marketTitle: act.title || act.marketTitle || act.market?.title || act.question || "",
      marketId: act.marketId || act.market?.id || act.conditionId || act.id || "",
      outcome: act.outcome || act.outcomeToken || "",
      shares: parseFloat(act.usdcSize || act.shares || act.size || act.amount || "0"),
      price: parseFloat(act.price || "0"),
      timestamp: act.timestamp || act.time || act.createdAt || "",
      pnl: act.pnl ? parseFloat(String(act.pnl)) : undefined,
      image: act.icon || act.image || act.market?.icon || act.market?.image || act.event?.icon || act.event?.image || ""
    }));

    // Transform PnL history - already transformed above if from user-pnl-api, otherwise transform here
    const transformedPnLHistory = pnlHistory.length > 0 && pnlHistory[0] && typeof pnlHistory[0].timestamp === 'number'
      ? pnlHistory
      .map((item: any) => ({
        timestamp: item.timestamp || item.time || Date.now(),
            cumulativePnl: parseFloat(item.cumulativePnl || item.p || item.pnl || item.value || "0"),
        date: item.date || new Date(item.timestamp || item.time || Date.now()).toISOString()
      }))
          .sort((a: any, b: any) => a.timestamp - b.timestamp) // Sort ascending
          .filter((item: any, index: number, array: any[]) => {
            // Remove duplicate timestamps - keep the first occurrence
            if (index === 0) return true;
            return item.timestamp !== array[index - 1].timestamp;
          })
      : pnlHistory
          .map((item: any) => ({
            timestamp: item.timestamp || item.time || (item.t ? item.t * 1000 : Date.now()),
            cumulativePnl: parseFloat(item.cumulativePnl || item.p || item.pnl || item.value || "0"),
            date: item.date || new Date(item.timestamp || item.time || (item.t ? item.t * 1000 : Date.now())).toISOString()
          }))
      .sort((a, b) => a.timestamp - b.timestamp) // Sort ascending
      .filter((item, index, array) => {
        // Remove duplicate timestamps - keep the first occurrence
        if (index === 0) return true;
        return item.timestamp !== array[index - 1].timestamp;
      });

    // Calculate metrics
    const totalTrades = userStats?.trades || userStats?.totalTrades || 0;
    const winRate = userStats?.winRate || userData?.winRate || 0;
    const accuracy = userStats?.accuracy || userData?.accuracy || 0;
    const marketsTraded = new Set(activities.map((a: any) => a.marketId || a.market?.id)).size || userStats?.marketsTraded || 0;
    const avgPositionSize = positions.length > 0 
      ? positions.reduce((sum, p) => sum + (p.value || 0), 0) / positions.length 
      : userStats?.avgPositionSize || 0;

    // Extract joinDate, profileViews, and largestWin from stats
    const joinDate = userStats?.joinDate || null;
    const profileViews = userStats?.views || userStats?.profileViews || 0;
    const largestWin = userStats?.largestWin || 0;

    const profile: any = {
      address,
      username: finalUsername,
      avatar,
      totalPnl,
      totalVolume,
      totalValue,
      accuracy,
      totalTrades,
      winRate,
      avgPositionSize,
      marketsTraded,
      positions: transformedPositions,
      closedPositions: transformedClosedPositions,
      recentActivity: transformedActivities,
      pnlHistory: transformedPnLHistory,
      joinDate,
      profileViews,
      largestWin
    };

    return c.json({
      success: true,
      profile
    });
  } catch (error: any) {
    console.error("[USER PROFILE] Error fetching user profile:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to fetch user profile",
      profile: null
    }, 500);
  }
});

/**
 * Get platform-wide statistics (24hr volume, total markets, etc.)
 */
polymarketRouter.get("/stats", async (c) => {
  try {
    // Fetch top markets to aggregate stats
    // We'll fetch a reasonable sample to calculate aggregate volume
    const limit = 500; // Get a good sample size
    const gammaUrl = `${GAMMA_API_BASE}/markets?limit=${limit}&offset=0&active=true&archived=false&closed=false&order=volume24hr&ascending=false`;
    
    const response = await fetch(gammaUrl);
    
    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status}`);
    }
    
    const markets = await response.json();
    const marketsArray = Array.isArray(markets) ? markets : (markets.data || markets || []);
    
    // Aggregate 24hr volume
    let totalVolume24hr = 0;
    let activeMarketsCount = 0;
    let totalLiquidity = 0;
    
    marketsArray.forEach((market: any) => {
      const primaryMarket = market.markets && Array.isArray(market.markets) && market.markets.length > 0 
        ? market.markets[0] 
        : market;
      
      // Get 24hr volume
      let volume24hrNum = 0;
      if (primaryMarket.volume24hr !== undefined && primaryMarket.volume24hr !== null) {
        volume24hrNum = parseFloat(String(primaryMarket.volume24hr)) || 0;
      } else if (primaryMarket.volume24hrClob !== undefined && primaryMarket.volume24hrClob !== null) {
        volume24hrNum = parseFloat(String(primaryMarket.volume24hrClob)) || 0;
      } else if (primaryMarket.volume24Hr !== undefined && primaryMarket.volume24Hr !== null) {
        volume24hrNum = parseFloat(String(primaryMarket.volume24Hr)) || 0;
      } else if (market.volume24hr !== undefined && market.volume24hr !== null) {
        volume24hrNum = parseFloat(String(market.volume24hr)) || 0;
      }
      
      totalVolume24hr += volume24hrNum;
      
      // Count active markets
      if (primaryMarket.active && !primaryMarket.closed && !primaryMarket.archived) {
        activeMarketsCount++;
      }
      
      // Get liquidity
      let liquidityNum = 0;
      if (primaryMarket.liquidity !== undefined && primaryMarket.liquidity !== null) {
        liquidityNum = parseFloat(String(primaryMarket.liquidity)) || 0;
      } else if (primaryMarket.totalLiquidity !== undefined && primaryMarket.totalLiquidity !== null) {
        liquidityNum = parseFloat(String(primaryMarket.totalLiquidity)) || 0;
      }
      
      totalLiquidity += liquidityNum;
    });
    
    // Format volume
    const formatVolume = (volume: number) => {
      if (volume >= 1000000) {
        return `$${(volume / 1000000).toFixed(2)}M`;
      } else if (volume >= 1000) {
        return `$${(volume / 1000).toFixed(2)}K`;
      } else {
        return `$${volume.toFixed(0)}`;
      }
    };
    
    return c.json({
      success: true,
      stats: {
        volume24hr: formatVolume(totalVolume24hr),
        volume24hrNum: totalVolume24hr,
        activeMarkets: activeMarketsCount,
        totalLiquidity: formatVolume(totalLiquidity),
        totalLiquidityNum: totalLiquidity
      }
    });
  } catch (error: any) {
    console.error("[PLATFORM STATS] Error fetching platform stats:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to fetch platform stats",
      stats: {
        volume24hr: "$0",
        volume24hrNum: 0,
        activeMarkets: 0,
        totalLiquidity: "$0",
        totalLiquidityNum: 0
      }
    }, 500);
  }
});

export default polymarketRouter;
