import { createClient } from '@/utils/supabase/client';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

const supabase = createClient();

// Initialize OpenAI client for main analysis
const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.2,
});

// Use a more efficient model for classification
const classifierLLM = new ChatOpenAI({
  modelName: "gpt-4o-mini", 
  temperature: 0,
  maxTokens: 10
});

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

// Step 2: Specialized data fetching strategies
async function fetchFactData(property) {
  // For fact questions, we only need basic property data, which we already have
  return { propertyDetails: property };
}

async function fetchComparisonData(property) {
  // Fetch properties in the same submarket for comparison
  const { data: similarProperties } = await supabase
    .from('properties')
    .select('*')
    .eq('Submarket', property.Submarket)
    .neq('Property_ID', property.Property_ID)
    .limit(5);
    
  // Fetch properties of similar age
  const yearRange = 5;
  const constructionYearLow = parseInt(property.YearBuilt) - yearRange;
  const constructionYearHigh = parseInt(property.YearBuilt) + yearRange;
  
  const { data: sameAgeProperties } = await supabase
    .from('properties')
    .select('*')
    .gte('YearBuilt', constructionYearLow)
    .lte('YearBuilt', constructionYearHigh)
    .limit(5);
    
  // Calculate average metrics for similar properties
  const avgRent = similarProperties?.length ? 
    similarProperties.reduce((sum, p) => sum + (parseFloat(p.Initial_Avg_Rent) || 0), 0) / similarProperties.length : 0;
  
  const avgOccupancy = similarProperties?.length ? 
    similarProperties.reduce((sum, p) => sum + (parseFloat(p.Occupancy_Month_3) || 0), 0) / similarProperties.length : 0;
  
  return {
    similarProperties: similarProperties || [],
    sameAgeProperties: sameAgeProperties || [],
    submarketAverages: {
      avgRent,
      avgOccupancy,
      totalProperties: similarProperties?.length || 0
    }
  };
}

async function fetchInvestmentData(property) {
  // Fetch rent growth data
  const { data: rentTrends } = await supabase
    .from('lease_up_performance')
    .select('Rent_Growth_3, Rent_Growth_6, Initial_Avg_Rent, Price_Position_vs_SubMarket')
    .eq('Submarket', property.Submarket)
    .order('Rent_Growth_6', { ascending: false })
    .limit(10);
    
  // Fetch occupancy data
  const { data: occupancyData } = await supabase
    .from('lease_up_performance')
    .select('Occupancy_Month_3, Lease_Up_Time')
    .eq('Submarket', property.Submarket)
    .order('Occupancy_Month_3', { ascending: false })
    .limit(10);
    
  // Calculate investment metrics
  const avgRentGrowth = rentTrends?.length ? 
    rentTrends.reduce((sum, p) => sum + (parseFloat(p.Rent_Growth_6) || 0), 0) / rentTrends.length : 0;
  
  const avgLeaseUpTime = occupancyData?.length ? 
    occupancyData.reduce((sum, p) => sum + (parseFloat(p.Lease_Up_Time) || 0), 0) / occupancyData.length : 0;
    
  return {
    rentTrends: rentTrends || [],
    occupancyData: occupancyData || [],
    investmentMetrics: {
      avgRentGrowth,
      avgLeaseUpTime,
      marketRank: rentTrends?.findIndex(p => p.Property_ID === property.Property_ID) || -1
    }
  };
}

async function fetchMarketData(property) {
  // Fetch submarket competition data
  const { data: submarketData } = await supabase
    .from('lease_up_performance')
    .select('Submarket_Competition, Interest_Rate, Unemployment_Rate')
    .eq('Submarket', property.Submarket)
    .limit(10);
    
  return {
    submarketData: submarketData || [],
    marketConditions: {
      competition: submarketData?.length ? 
        submarketData.reduce((sum, p) => sum + (parseFloat(p.Submarket_Competition) || 0), 0) / submarketData.length : 0,
      interestRate: submarketData?.[0]?.Interest_Rate || 'Unknown',
      unemploymentRate: submarketData?.[0]?.Unemployment_Rate || 'Unknown'
    }
  };
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
  
  FACTUAL QUESTION: {question}
  
  Give a direct, concise answer to this factual question. Keep your response to one or two sentences maximum. Do not provide analysis or comparisons unless specifically asked.
  
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
  
  COMPARISON QUESTION: {question}
  
  Provide a structured comparison using this format exactly:
  
  This property <comparisonStatement>
  
  • <keyPoint1>
  • <keyPoint2>
  • <keyPoint3 if needed>
  
  <actionableConclusion>
  
  Focus on meaningful differences and use specific numbers when available.
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
  
  INVESTMENT QUESTION: {question}
  
  Analyze this property's investment potential with this format:
  
  <investmentSummary>
  
  • <financialMetric1>
  • <financialMetric2>
  • <riskFactor>
  
  <investmentRecommendation>
  
  Be specific about ROI potential, risk factors, and use available metrics.
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
  
  MARKET QUESTION: {question}
  
  Provide market analysis with this structure:
  
  <Market Overview>
  Begin with a 1-2 sentence overview of the market conditions for this property.
  
  • <Trend Point 1>
  • <Trend Point 2>
  • <Competition Insight>
  
  <Market Prediction>
  
  Focus on specific market conditions relevant to this property and location.
  When discussing rent growth patterns, analyze the property's submarket trends 
  compared to the broader market.
`);

// Step 4: Create the chains for each question type
const factChain = RunnableSequence.from([
  factPrompt,
  llm,
  new StringOutputParser()
]);

const comparisonChain = RunnableSequence.from([
  comparisonPrompt,
  llm,
  new StringOutputParser()
]);

const investmentChain = RunnableSequence.from([
  investmentPrompt,
  llm,
  new StringOutputParser()
]);

const marketChain = RunnableSequence.from([
  marketPrompt,
  llm,
  new StringOutputParser()
]);

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
          ...contextData
        });
        break;
        
      case "COMPARISON":
        contextData = await fetchComparisonData(property);
        response = await comparisonChain.invoke({
          ...basePromptData,
          similarProperties: JSON.stringify(contextData.similarProperties),
          sameAgeProperties: JSON.stringify(contextData.sameAgeProperties),
          submarketAverages: JSON.stringify(contextData.submarketAverages)
        });
        break;
        
      case "INVESTMENT":
        contextData = await fetchInvestmentData(property);
        response = await investmentChain.invoke({
          ...basePromptData,
          rentTrends: JSON.stringify(contextData.rentTrends),
          occupancyData: JSON.stringify(contextData.occupancyData),
          investmentMetrics: JSON.stringify(contextData.investmentMetrics)
        });
        break;
        
      case "MARKET":
        contextData = await fetchMarketData(property);
        response = await marketChain.invoke({
          ...basePromptData,
          submarketData: JSON.stringify(contextData.submarketData),
          marketTrends: JSON.stringify(contextData.marketTrends),
          marketConditions: JSON.stringify(contextData.marketConditions)
        });
        break;
        
      default:
        // Fallback to comparison as the default
        contextData = await fetchComparisonData(property);
        response = await comparisonChain.invoke({
          ...basePromptData,
          similarProperties: JSON.stringify(contextData.similarProperties),
          sameAgeProperties: JSON.stringify(contextData.sameAgeProperties),
          submarketAverages: JSON.stringify(contextData.submarketAverages)
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