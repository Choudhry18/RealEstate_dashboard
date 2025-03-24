import { createClient } from '@/utils/supabase/client';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

const supabase = createClient();

// Initialize OpenAI client for main analysis
const llm = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.2,
});

// Use a more efficient model for classification
const classifierLLM = new ChatOpenAI({
  modelName: "gpt-4o-mini", 
  temperature: 0,
  maxTokens: 10
});

// Initialize web search enabled model
const webSearchEnabledLLM = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.2,
}).bindTools([
  { type: "web_search_preview" },
]);

// Step 1: Create question classifier
const classifierPrompt = PromptTemplate.fromTemplate(`
  You are classifying real estate property questions.
  Classify this question: "{question}"
  
  Into one of these exact categories:
  - FACT: Simple factual questions about property details, location, or features
  - COMPARISON: Questions comparing this property to others in the market/area
  - INVESTMENT: Questions about investment potential, ROI, or value
  - MARKET: Questions about market trends, predictions, or conditions
  
  Return ONLY ONE word from the above options.
`);

const classifier = RunnableSequence.from([
  classifierPrompt,
  classifierLLM,
  new StringOutputParser()
]);

// New augmented chain with web search capability
const createAugmentedChain = (basePrompt, shouldUseWebSearch) => {
  if (shouldUseWebSearch) {
    return RunnableSequence.from([
      basePrompt,
      webSearchEnabledLLM, 
      new StringOutputParser()
    ]);
  } else {
    // Return standard chain without web search
    return RunnableSequence.from([
      basePrompt,
      llm,
      new StringOutputParser()
    ]);
  }
};

// Step 2: Specialized data fetching strategies
async function fetchFactData(property) {
  // For fact questions, we only need basic property data, which we already have
  // But let's also fetch rent data for completeness
  const rentData = await fetchRentData(property);
  
  return { 
    propertyDetails: property,
    yearlyRents: rentData.yearlyRents
  };
}

async function fetchComparisonData(property) {
  // Fetch properties in the same submarket for comparison
  const { data: similarProperties } = await supabase
    .from('properties')
    .select('*')
    .eq('submarket', property.Submarket)
    .limit(5);
    
  // Fetch properties of similar age
  const yearRange = 5;
  const constructionYearLow = parseInt(property.YearBuilt) - yearRange;
  const constructionYearHigh = parseInt(property.YearBuilt) + yearRange;
  
  const { data: sameAgeProperties } = await supabase
    .from('properties')
    .select('*')
    .gte('year_built', constructionYearLow)
    .lte('year_built', constructionYearHigh)
    .limit(5);
    
  
  // Fetch rent data
  const rentData = await fetchRentData(property);
  
  return {
    similarProperties: similarProperties || [],
    sameAgeProperties: sameAgeProperties || [],
    yearlyRents: rentData.yearlyRents || {}
  };
}

async function fetchInvestmentData(property) {
  // Fetch rent growth data
  const { data: rentTrends } = await supabase
    .from('lease_up_performance')
    .select('rent_growth_3, rent_growth_6, initial_avg_rent, price_position_vs_submarket')
    .eq('property_id', property.property_id)
    .limit(1);

  
  // Fetch occupancy data
  const { data: occupancyData } = await supabase
    .from('lease_up_performance')
    .select('occupancy_month_3', "submarket_competition")
    .eq('property_id', property.property_id)
    .limit(1);
    
  // Fetch rent data
  const rentData = await fetchRentData(property);
  
  return {
    rentTrends: rentTrends || [],
    occupancyData: occupancyData || [],
    yearlyRents: rentData.yearlyRents || {}
  };
}

async function fetchMarketData(property) {
  // Fetch submarket competition data
  const { data: submarketData } = await supabase
    .from('lease_up_performance')
    .select('Submarket_Competition, Interest_Rate, Unemployment_Rate')
    .eq('Submarket', property.Submarket)
    .limit(10);
    
  // Fetch rent data
  const rentData = await fetchRentData(property);
  
  return {
    submarketData: submarketData || [],
    marketConditions: {
      competition: submarketData?.length ? 
        submarketData.reduce((sum, p) => sum + (parseFloat(p.Submarket_Competition) || 0), 0) / submarketData.length : 0,
      interestRate: submarketData?.[0]?.Interest_Rate || 'Unknown',
      unemploymentRate: submarketData?.[0]?.Unemployment_Rate || 'Unknown'
    },
    yearlyRents: rentData.yearlyRents || {}
  };
}

async function fetchRentData(property) {
  try {
    // Fetch rent data for the specific property by name
    const { data: rentData, error } = await supabase
      .from('yearly_rent')
      .select('*')
      .eq('Name', property.Name)
      .limit(1);
    
    if (error) throw error;
    
    // Process the yearly rent data
    const rentRecord = rentData && rentData.length > 0 ? rentData[0] : null;
    // Define all possible years we're looking for
    const allYears = Array.from({ length: 13 }, (_, i) => 2008 + i);
    
    // Create a structured rent history object with yearly data
    const yearlyRents = {};
    
    if (rentRecord) {
      // Extract rent data for each year
      for (const year of allYears) {
        yearlyRents[year] = rentRecord[year] || "Property not leased yet";
      }
    }

    
    return {
      propertyRent: rentRecord || {},
      yearlyRents: yearlyRents,
      submarket: property.Submarket
    };
  } catch (error) {
    console.error('Error fetching rent data:', error);
    return {
      propertyRent: {},
      yearlyRents: {},
      error: error.message
    };
  }
}

// Step 3: Create specialized prompts for each question type
const factPrompt = PromptTemplate.fromTemplate(`
  You are providing factual information about a property.
  
  PROPERTY INFORMATION:
  Name: {name}
  Address: {address}
  City: {city}
  State: {state}
  Year Built: {yearBuilt}
  Units: {units}
  Levels: {levels}
  Submarket: {submarket}
  
  PROPERTY RENT HISTORY:
  {yearlyRents}
  
  FACTUAL QUESTION: {question}
  
  Give a direct, concise answer to this factual question. Keep your response to one or two sentences maximum. 
  If the question relates to rent or leasing history, use the yearly rent data provided.
  Do not provide analysis or comparisons unless specifically asked.
  
  Just state the fact and stop. No additional context needed.
`);

const comparisonPrompt = PromptTemplate.fromTemplate(`
  You are a real estate analyst providing comparative insights.
  
  PROPERTY INFORMATION:
  Name: {name}
  Address: {address}
  City: {city}
  State: {state}
  Year Built: {yearBuilt}
  Units: {units}
  Levels: {levels}
  Submarket: {submarket}
  
  COMPARATIVE DATA:
  Similar Properties in Submarket: {similarProperties}
  Properties of Similar Age: {sameAgeProperties}
  Submarket Averages: {submarketAverages}
  Property Rent History: {yearlyRents}
  
  COMPARISON QUESTION: {question}
  
  Provide a structured comparison using this format exactly:
  
  This property <comparisonStatement>
  
  • <keyPoint1>
  • <keyPoint2>
  • <keyPoint3 if needed>
  
  <actionableConclusion>
  
  Focus on meaningful differences and use specific numbers when available.
  If the question relates to rent trends, analyze the property's rent history compared to market averages.
`);

const investmentPrompt = PromptTemplate.fromTemplate(`
  You are a real estate investment analyst evaluating investment potential.
  
  PROPERTY INFORMATION:
  Name: {name}
  Address: {address}
  City: {city}
  State: {state}
  Year Built: {yearBuilt}
  Units: {units}
  Levels: {levels}
  Submarket: {submarket}
  
  INVESTMENT METRICS:
  Rent Trends: {rentTrends}
  Occupancy Data: {occupancyData}
  Investment Performance: {investmentMetrics}
  Historical Rent Data (by year): {yearlyRents}
  
  INVESTMENT QUESTION: {question}
  
  Analyze this property's investment potential with this format:
  
  <investmentSummary>
  
  • <financialMetric1>
  • <financialMetric2>
  • <riskFactor>
  
  <investmentRecommendation>
  
  Be specific about ROI potential, risk factors, and use available metrics.
  If historical rent data shows trends, include an analysis of rent growth patterns in your assessment.
`);

const marketPrompt = PromptTemplate.fromTemplate(`
  You are a real estate market analyst examining market conditions.
  
  PROPERTY INFORMATION:
  Name: {name}
  Address: {address}
  City: {city}
  State: {state}
  Year Built: {yearBuilt}
  Units: {units}
  Levels: {levels}
  Submarket: {submarket}
  
  MARKET CONDITIONS:
  Submarket Data: {submarketData}
  Market Trends: {marketTrends}
  Economic Indicators: {marketConditions}
  Property Rent History: {yearlyRents}
  
  MARKET QUESTION: {question}

  INSTRUCTIONS:
  1. First analyze the internal database information provided, including the property's rent history.
  2. Then, supplement this with current web information about:
     - Current economic conditions affecting the {submarket} area
     - New construction or development projects near {address}
     - Recent rent trends in the broader market
  
  Provide market analysis with this structure:
  
  <Market Overview>
  Begin with a 1-2 sentence overview of the market conditions for this property.
  
  • <1 line max Trend Point 1>
  • <1 line max Trend Point 2 ONLY IF NEEDED>
  • <Competition Insight>
  
  <Concise 1 LINE MAX Market Prediction IF GOOD INSIGHTS available>
  
  Focus on specific market conditions relevant to this property and location.
  When discussing rent growth patterns, compare the property's historical rent data
  with broader market trends from web research.
  
  IMPORTANT: When you use information from web searches, include a citation using the format:
  [Source name](URL)
`);

// Step 4: Create the chains for each question type
// Create chains with and without web search capability
const factChain = createAugmentedChain(factPrompt, false); // Facts don't need web search
const comparisonChain = createAugmentedChain(comparisonPrompt, false); // Use local data
const investmentChain = createAugmentedChain(investmentPrompt, true); // Use web for investment trends
const marketChain = createAugmentedChain(marketPrompt, true); // Use web for market insights

// Create the main handler
export async function POST(request) {
  try {
    const { question, propertyData } = await request.json();
    
    // Ensure required property fields exist
    const property = {
      Property_ID: propertyData.id || 'unknown',
      Name: propertyData.Name || propertyData.title || 'Unnamed Property',
      Address: propertyData.Address || 'Unknown Address',
      City: propertyData.City || 'Unknown City',
      State: propertyData.State || 'TX',
      YearBuilt: propertyData.YearBuilt || 'Unknown',
      Quantity: propertyData.Quantity || propertyData.Units || '0',
      Level: propertyData.Level || '1',
      Submarket: propertyData.Submarket || 'Unknown'
    };

    console.log("Property data:", property);
    console.log("Processing question:", question);
    
    // Classify the question
    const questionType = await classifier.invoke({ question });
    console.log("Question classified as:", questionType);
    
    // Fetch appropriate data based on question type
    let contextData = {};
    let response = "";
    
    // Prepare base prompt data that's common to all question types
    const basePromptData = {
      name: property.Name,
      address: property.Address,
      city: property.City,
      state: property.State,
      yearBuilt: property.YearBuilt,
      units: property.Quantity,
      levels: property.Level,
      submarket: property.Submarket,
      question: question
    };
    
    // Process based on question type
    switch(questionType.trim().toUpperCase()) {
      case "FACT":
        contextData = await fetchFactData(property);
        response = await factChain.invoke({
          ...basePromptData,
          yearlyRents: JSON.stringify(contextData.yearlyRents || {})
        });
        break;
        
      case "COMPARISON":
        contextData = await fetchComparisonData(property);
        response = await comparisonChain.invoke({
          ...basePromptData,
          similarProperties: JSON.stringify(contextData.similarProperties),
          sameAgeProperties: JSON.stringify(contextData.sameAgeProperties),
          submarketAverages: JSON.stringify(contextData.submarketAverages),
          yearlyRents: JSON.stringify(contextData.yearlyRents || {})
        });
        break;
        
      case "INVESTMENT":
        contextData = await fetchInvestmentData(property);
        response = await investmentChain.invoke({
          ...basePromptData,
          rentTrends: JSON.stringify(contextData.rentTrends),
          occupancyData: JSON.stringify(contextData.occupancyData),
          investmentMetrics: JSON.stringify(contextData.investmentMetrics),
          yearlyRents: JSON.stringify(contextData.yearlyRents || {})
        });
        break;
        
      case "MARKET":
        contextData = await fetchMarketData(property);
        response = await marketChain.invoke({
          ...basePromptData,
          submarketData: JSON.stringify(contextData.submarketData),
          marketTrends: JSON.stringify(contextData.marketTrends || {}),
          marketConditions: JSON.stringify(contextData.marketConditions),
          yearlyRents: JSON.stringify(contextData.yearlyRents || {})
        });
        break;
        
      default:
        // Fallback to comparison as the default
        contextData = await fetchComparisonData(property);
        response = await comparisonChain.invoke({
          ...basePromptData,
          similarProperties: JSON.stringify(contextData.similarProperties),
          sameAgeProperties: JSON.stringify(contextData.sameAgeProperties),
          submarketAverages: JSON.stringify(contextData.submarketAverages),
          yearlyRents: JSON.stringify(contextData.yearlyRents || {})
        });
    }
    
    // Return the response with metadata
    return new Response(JSON.stringify({ 
      response,
      questionType: questionType.trim(),
      property,
      contextSummary: {
        // Include a summary of what data was used to answer
        dataTypes: Object.keys(contextData),
        recordsUsed: Object.values(contextData)
          .filter(val => Array.isArray(val))
          .reduce((sum, arr) => sum + arr.length, 0)
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Property AI error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate property insights',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}