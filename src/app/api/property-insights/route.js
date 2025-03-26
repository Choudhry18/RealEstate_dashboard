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
  - COMPLEX_FACT: Detailed factual questions that may require external information or research
  - COMPARISON: Questions comparing this property to others in the market/area
  - INVESTMENT: Questions about investment potential, ROI, or value
  - MARKET: Questions about market trends, predictions, or conditions
  - IRRELEVANT: Questions not related to real estate, this specific property, inappropriate content, or completely off-topic requests
  
  Return ONLY ONE word from the above options.
`);

const classifier = RunnableSequence.from([
  classifierPrompt,
  classifierLLM,
  new StringOutputParser()
]);

// Enhanced web search chain with specific guidance
const createAugmentedChain = (basePrompt, shouldUseWebSearch) => {
  if (shouldUseWebSearch) {
    // Add a system message to encourage web search usage
    const webSearchPrompt = PromptTemplate.fromTemplate(`
      You are a real estate analyst with web search capability.
      Follow these steps precisely:
      
      1. Analyze the internal database information provided
      2. Use web search to find current information about:
         - Recent market conditions in for {submarket} submarket
         - Current economic trends affecting real estate in this area
         - New developments or construction projects nearby
      3. Incorporate both sets of information in your response, ONLY INCLUDE WEB SEARCH FACTS IF RELEVANT
      
      EXAMPLE WEB SEARCH QUERY: "real estate market trends in {city} {state} {submarket} 2025"
      EXAMPLE WEB SEARCH QUERY: "new construction projects near {address} {city}"
      EXAMPLE WEB SEARCH QUERY: "average rent prices in {submarket} {city} current"
      
      For each fact from web search, include a citation like this: [Source name](URL)
      
      Now, answer this question about {name}:
      
      {question}
      
      ${basePrompt.template}
    `);
    
    return RunnableSequence.from([
      webSearchPrompt,
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
    yearlyRents: rentData.yearlyRents,
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
    
  
  // Fetch property-specific data
  const gradeData = await fetchGradeData(property);
  const pricePositionData = await fetchPricePositionData(property);

  return {
    similarProperties: similarProperties || [],
    sameAgeProperties: sameAgeProperties || [],
    yearlyGrades: gradeData.yearlyGrades,
    yearlyPricePositions: pricePositionData.yearlyPricePositions,
  };
}

async function fetchInvestmentData(property) {
  // Fetch property-specific data
  const rentData = await fetchRentData(property);
  const gradeData = await fetchGradeData(property);
  const pricePositionData = await fetchPricePositionData(property);
  
  // Fetch submarket averages from rent_growth table
  const { data: submarketRents } = await supabase
    .from('rent_growth')
    .select('*')
    .eq('Submarket', property.Submarket)
    .limit(10);
  
  // Calculate investment metrics based on historical data
  // 1. Calculate annual rent growth from historical rents
  const yearlyRents = rentData.yearlyRents;
  const availableYears = Object.keys(yearlyRents)
    .map(Number)
    .filter(year => 
      typeof yearlyRents[year] === 'number' || 
      (!isNaN(parseFloat(yearlyRents[year])) && 
       yearlyRents[year] !== "Property not leased yet")
    )
    .sort();
  
  let annualRentGrowth = 0;
  let shortTermRentGrowth = 0;
  let longTermRentGrowth = 0;
  
  if (availableYears.length >= 2) {
    // Calculate long-term growth (from first to last available year)
    const firstYear = availableYears[0];
    const lastYear = availableYears[availableYears.length - 1];
    const firstRent = parseFloat(yearlyRents[firstYear]);
    const lastRent = parseFloat(yearlyRents[lastYear]);
    const yearsDiff = lastYear - firstYear;
    
    if (yearsDiff > 0 && firstRent > 0) {
      // Calculate compound annual growth rate
      annualRentGrowth = (Math.pow(lastRent / firstRent, 1 / yearsDiff) - 1) * 100;
      longTermRentGrowth = ((lastRent - firstRent) / firstRent) * 100;
    }
    
    // Calculate short-term growth (last 3 years or closest available)
    if (availableYears.length >= 3) {
      const recentYears = availableYears.slice(-3);
      const oldestRecentYear = recentYears[0];
      const rentAtOldestRecent = parseFloat(yearlyRents[oldestRecentYear]);
      
      if (rentAtOldestRecent > 0) {
        shortTermRentGrowth = ((lastRent - rentAtOldestRecent) / rentAtOldestRecent) * 100;
      }
    }
  }
  
  // 2. Calculate grade improvement
  const yearlyGrades = gradeData.yearlyGrades;
  const gradeYears = Object.keys(yearlyGrades)
    .map(Number)
    .filter(year => yearlyGrades[year] && yearlyGrades[year] !== "N/A")
    .sort();
  
  let gradeImprovement = "Unchanged";
  
  if (gradeYears.length >= 2) {
    const firstYear = gradeYears[0];
    const lastYear = gradeYears[gradeYears.length - 1];
    const firstGrade = yearlyGrades[firstYear];
    const lastGrade = yearlyGrades[lastYear];
    
    // Convert grades to numeric values (A+=4.3, A=4.0, A-=3.7, etc.)
    function gradeToNumber(grade) {
      const baseGrade = grade.charAt(0).toUpperCase();
      const modifier = grade.length > 1 ? grade.charAt(1) : '';
      
      let value = 0;
      if (baseGrade === 'A') value = 4;
      else if (baseGrade === 'B') value = 3;
      else if (baseGrade === 'C') value = 2;
      else if (baseGrade === 'D') value = 1;
      else if (baseGrade === 'F') value = 0;
      
      if (modifier === '+') value += 0.3;
      else if (modifier === '-') value -= 0.3;
      
      return value;
    }
    
    const firstGradeValue = gradeToNumber(firstGrade);
    const lastGradeValue = gradeToNumber(lastGrade);
    const gradeDiff = lastGradeValue - firstGradeValue;
    
    if (gradeDiff > 0.5) gradeImprovement = "Significant Improvement";
    else if (gradeDiff > 0) gradeImprovement = "Slight Improvement";
    else if (gradeDiff < -0.5) gradeImprovement = "Significant Decline";
    else if (gradeDiff < 0) gradeImprovement = "Slight Decline";
  }
  
  // 3. Calculate average price position
  const yearlyPricePositions = pricePositionData.yearlyPricePositions;
  const pricePositionYears = Object.keys(yearlyPricePositions)
    .map(Number)
    .filter(year => 
      yearlyPricePositions[year] && 
      yearlyPricePositions[year] !== "N/A" && 
      !isNaN(parseFloat(yearlyPricePositions[year]))
    )
    .sort();
  
  let avgPricePosition = 0;
  let recentPricePosition = 0;
  
  if (pricePositionYears.length > 0) {
    const positions = pricePositionYears.map(year => parseFloat(yearlyPricePositions[year]));
    avgPricePosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    
    // Get the most recent price position
    recentPricePosition = parseFloat(yearlyPricePositions[pricePositionYears[pricePositionYears.length - 1]]);
  }
  
  // Calculate submarket average metrics for comparison
  const submarketRentGrowth = calculateSubmarketRentGrowth(submarketRents);
  
  return {
    yearlyRents: rentData.yearlyRents,
    yearlyGrades: gradeData.yearlyGrades,
    yearlyPricePositions: pricePositionData.yearlyPricePositions,
    investmentMetrics: {
      annualRentGrowth,
      shortTermRentGrowth,
      longTermRentGrowth,
      gradeImprovement,
      avgPricePosition,
      recentPricePosition,
      submarketRentGrowth
    }
  };
}

function calculateSubmarketRentGrowth(submarketProperties) {
  if (!submarketProperties || submarketProperties.length === 0) {
    return {
      annual: 0,
      shortTerm: 0,
      longTerm: 0
    };
  }
  
  const availableYears = Array.from({ length: 13 }, (_, i) => 2008 + i);
  
  // Calculate average rent by year for the submarket
  const yearlyAvgRents = {};
  
  for (const year of availableYears) {
    const yearStr = year.toString();
    const propertiesWithRent = submarketProperties.filter(p => 
      p[yearStr] && p[yearStr] !== "Property not leased yet" && !isNaN(parseFloat(p[yearStr]))
    );
    
    if (propertiesWithRent.length > 0) {
      const avgRent = propertiesWithRent.reduce((sum, p) => sum + parseFloat(p[yearStr]), 0) / propertiesWithRent.length;
      yearlyAvgRents[year] = avgRent;
    }
  }
  
  // Calculate growth rates
  const yearsWithData = Object.keys(yearlyAvgRents).map(Number).sort();
  
  if (yearsWithData.length < 2) {
    return {
      annual: 0,
      shortTerm: 0,
      longTerm: 0
    };
  }
  
  const firstYear = yearsWithData[0];
  const lastYear = yearsWithData[yearsWithData.length - 1];
  const firstRent = yearlyAvgRents[firstYear];
  const lastRent = yearlyAvgRents[lastYear];
  const yearsDiff = lastYear - firstYear;
  
  // Annual compound growth rate
  const annualGrowth = (Math.pow(lastRent / firstRent, 1 / yearsDiff) - 1) * 100;
  
  // Long-term total growth
  const longTermGrowth = ((lastRent - firstRent) / firstRent) * 100;
  
  // Short-term growth (3 years or available)
  let shortTermGrowth = 0;
  if (yearsWithData.length >= 3) {
    const recentYears = yearsWithData.slice(-3);
    const oldestRecentYear = recentYears[0];
    const rentAtOldestRecent = yearlyAvgRents[oldestRecentYear];
    
    shortTermGrowth = ((lastRent - rentAtOldestRecent) / rentAtOldestRecent) * 100;
  }
  
  return {
    annual: annualGrowth,
    shortTerm: shortTermGrowth,
    longTerm: longTermGrowth
  };
}

async function fetchMarketData(property) {
  // Fetch property-specific data
  const rentData = await fetchRentData(property);
  const gradeData = await fetchGradeData(property);
  const pricePositionData = await fetchPricePositionData(property);
  
  // Fetch all properties in this submarket to analyze market trends
  const { data: submarketRentData } = await supabase
    .from('rent_growth')
    .select('*')
    .eq('Submarket', property.Submarket)
    .limit(20);
    
  const { data: submarketGradeData } = await supabase
    .from('submarket_grade')
    .select('*')
    .eq('Submarket', property.Submarket)
    .limit(20);
    
  const { data: submarketPricePositionData } = await supabase
    .from('price_position')
    .select('*')
    .eq('Submarket', property.Submarket)
    .limit(20);
    
  // Calculate yearly submarket statistics
  const availableYears = Array.from({ length: 13 }, (_, i) => 2008 + i);
  
  // Rent trends by year
  const rentTrends = {};
  for (const year of availableYears) {
    const yearStr = year.toString();
    const propertiesWithRent = submarketRentData?.filter(p => 
      p[yearStr] && p[yearStr] !== "Property not leased yet" && !isNaN(parseFloat(p[yearStr]))
    );
    
    if (propertiesWithRent?.length > 0) {
      const avgRent = propertiesWithRent.reduce((sum, p) => sum + parseFloat(p[yearStr]), 0) / propertiesWithRent.length;
      rentTrends[year] = {
        avgRent,
        propertyCount: propertiesWithRent.length
      };
    }
  }
  
  // Calculate year-over-year growth
  const rentGrowthByYear = {};
  const yearsWithRent = Object.keys(rentTrends).map(Number).sort();
  
  for (let i = 1; i < yearsWithRent.length; i++) {
    const currentYear = yearsWithRent[i];
    const previousYear = yearsWithRent[i-1];
    
    const currentRent = rentTrends[currentYear].avgRent;
    const previousRent = rentTrends[previousYear].avgRent;
    
    if (previousRent > 0) {
      const growthRate = ((currentRent - previousRent) / previousRent) * 100;
      rentGrowthByYear[currentYear] = growthRate;
    }
  }
  
  // Grade distribution by year
  const gradeDistribution = {};
  for (const year of availableYears) {
    const gradeField = `${year}_grade`;
    const propertiesWithGrade = submarketGradeData?.filter(p => 
      p[gradeField] && p[gradeField] !== "N/A"
    );
    
    if (propertiesWithGrade?.length > 0) {
      // Count occurrences of each grade
      const distribution = {};
      propertiesWithGrade.forEach(p => {
        const grade = p[gradeField];
        distribution[grade] = (distribution[grade] || 0) + 1;
      });
      
      // Calculate percentages
      const totalProperties = propertiesWithGrade.length;
      const percentageDistribution = {};
      
      for (const [grade, count] of Object.entries(distribution)) {
        percentageDistribution[grade] = (count / totalProperties) * 100;
      }
      
      gradeDistribution[year] = {
        distribution: percentageDistribution,
        totalProperties
      };
    }
  }
  
  // Calculate property count growth as a proxy for market expansion
  let marketExpansionRate = 0;
  const earliestYear = yearsWithRent[0];
  const latestYear = yearsWithRent[yearsWithRent.length - 1];
  
  if (rentTrends[earliestYear] && rentTrends[latestYear]) {
    const earliestPropertyCount = rentTrends[earliestYear].propertyCount;
    const latestPropertyCount = rentTrends[latestYear].propertyCount;
    
    if (earliestPropertyCount > 0) {
      marketExpansionRate = ((latestPropertyCount - earliestPropertyCount) / earliestPropertyCount) * 100;
    }
  }
  
  // Compute recent trends (last 3 years)
  const recentYears = yearsWithRent.slice(-3);
  let recentRentGrowth = 0;
  
  if (recentYears.length >= 2) {
    const recentGrowthRates = recentYears.slice(1).map(year => rentGrowthByYear[year] || 0);
    recentRentGrowth = recentGrowthRates.reduce((sum, rate) => sum + rate, 0) / recentGrowthRates.length;
  }
  
  // Calculate market conditions summary
  const marketConditions = {
    submarketName: property.Submarket,
    currentAvgRent: rentTrends[latestYear]?.avgRent || 0,
    recentRentGrowth,
    historicalAvgGrowth: Object.values(rentGrowthByYear).reduce((sum, rate) => sum + rate, 0) / Object.values(rentGrowthByYear).length,
    propertyExpansionRate: marketExpansionRate,
    dominantGrade: getDominantGrade(gradeDistribution[latestYear]?.distribution || {})
  };
  
  return {
    yearlyRents: rentData.yearlyRents,
    yearlyGrades: gradeData.yearlyGrades,
    yearlyPricePositions: pricePositionData.yearlyPricePositions,
    rentTrends,
    rentGrowthByYear,
    gradeDistribution,
    marketConditions
  };
}

function getDominantGrade(gradeDistribution) {
  let dominantGrade = null;
  let highestPercentage = 0;
  
  for (const [grade, percentage] of Object.entries(gradeDistribution)) {
    if (percentage > highestPercentage) {
      dominantGrade = grade;
      highestPercentage = percentage;
    }
  }
  
  return dominantGrade;
}

async function fetchRentData(property) {
  try {
    // Fetch rent data for the specific property by name
    const { data: rentData, error } = await supabase
      .from('rent_growth')
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

async function fetchGradeData(property) {
  try {
    // Fetch grade data for the specific property by name
    const { data: gradeData, error } = await supabase
      .from('submarket_grade')
      .select('*')
      .eq('Name', property.Name)
      .limit(1);
    
    // Process the yearly grade data
    const gradeRecord = gradeData && gradeData.length > 0 ? gradeData[0] : null;
    // Define all possible years we're looking for
    const allYears = Array.from({ length: 13 }, (_, i) => 2008 + i);
    
    // Create a structured grade history object with yearly data
    const yearlyGrades = {};
    
    if (gradeRecord) {
      // Extract grade data for each year
      for (const year of allYears) {
        yearlyGrades[year] = gradeRecord[`${year}_grade`] || "N/A";
      }
    }
    
    return {
      propertyGrades: gradeRecord || {},
      yearlyGrades: yearlyGrades,
    };
  } catch (error) {
    console.error('Error fetching grade data:', error);
    return {
      propertyGrades: {},
      yearlyGrades: {},
      error: error.message
    };
  }
}

async function fetchPricePositionData(property) {
  try {
    // Fetch price position data for the specific property by name
    const { data: positionData, error } = await supabase
      .from('price_position')
      .select('*')
      .eq('Name', property.Name)
      .limit(1);
    
    if (error) throw error;
    
    // Process the yearly price position data
    const positionRecord = positionData && positionData.length > 0 ? positionData[0] : null;
    // Define all possible years we're looking for
    const allYears = Array.from({ length: 13 }, (_, i) => 2008 + i);
    
    // Create a structured price position history object with yearly data
    const yearlyPricePositions = {};
    
    if (positionRecord) {
      // Extract price position data for each year
      for (const year of allYears) {
        yearlyPricePositions[year] = positionRecord[`price_position_${year}`] || "N/A";
      }
    }
    
    return {
      propertyPricePositions: positionRecord || {},
      yearlyPricePositions: yearlyPricePositions,
    };
  } catch (error) {
    console.error('Error fetching price position data:', error);
    return {
      propertyPricePositions: {},
      yearlyPricePositions: {},
      error: error.message
    };
  }
}

// Step 3: Create specialized prompts for each question type with few-shot examples
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

const complexFactPrompt = PromptTemplate.fromTemplate(`
  You are providing detailed factual information about a property using both internal database and web search.
  
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
  
  COMPLEX FACTUAL QUESTION: {question}
  
  INSTRUCTIONS:
  1. First check the internal database information provided
  2. If the question cannot be fully answered with the internal data, use web search to find the necessary information
  3. For web searches, consider using queries like:
     - "{name} {address} property details"
     - "{name} {city} real estate facts"
     - "{submarket} {city} property information"
  4. When you include information from web searches, provide a citation using the format: [Source name](URL)
  
  Give a comprehensive but concise answer to this factual question. 
  Integrate information from both the database and web search (if needed).
  
  EXAMPLES:
  
  Question: What amenities does this property offer?
  Answer:
  The Woodlands at Main offers a premium amenity package including a resort-style pool, 24-hour fitness center, pet park, and business center. The property also features EV charging stations and private garages for select units. [The Woodlands Official Site](https://www.woodlandsmain.com/amenities)
  
  Question: What school districts serve this property?
  Answer:
  The Ridgeline Apartments are served by the Leander Independent School District. Specifically, children at this address attend River Ridge Elementary School (K-5), Canyon Ridge Middle School (6-8), and Vista Ridge High School (9-12). [Leander ISD](https://www.leanderisd.org/schools)
  
  Now, provide a factual answer to this question about {name}: {question}
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
  
  PROPERTY HISTORICAL DATA:
  Yearly Rents: {yearlyRents}
  Yearly Grades: {yearlyGrades}
  Yearly Rent Relative to Submarket (formula = propertyRent/submarketAverageRent): {yearlyPricePositions}
  
  COMPARATIVE DATA:
  Similar Properties in Submarket: {similarProperties}
  Properties of Similar Age: {sameAgeProperties}
  
  COMPARISON QUESTION: {question}
  
  Provide a structured comparison using this format exactly:
  
  This property <comparisonStatement>
  
  • <keyPoint1>
  • <keyPoint2>
  • <keyPoint3 if needed>
  
  <actionableConclusion>
  
  Focus on meaningful differences and use specific numbers when available.
  If the question relates to trends over time, analyze the property's historical data (rents, grades, price positions).
  
  EXAMPLES:
  
  Question: How does this property compare to others in the area?
  Answer:
  This property outperforms most competitors in the Mueller submarket based on key metrics.
  
  • Rent is 8% higher than the submarket average of $1,450, indicating strong market positioning
  • Property grade has improved from B- in 2015 to A- in 2020, while most similar properties maintained constant grades
  • Price position of +5.2% relative to the submarket is better than 80% of comparable properties
  
  These advantages suggest the property can maintain its premium position if well-maintained.
  
  Question: How have the grades changed over time compared to similar properties?
  Answer:
  This property shows consistent grade improvement over time while similar properties have remained static.
  
  • Property grade improved from C+ in 2010 to B+ in 2020, representing a two-level improvement
  • Most comparable properties in the submarket maintained the same grade throughout this period
  • Year 2015 was a pivotal point when the property first surpassed the submarket average grade
  
  The positive grade trajectory indicates effective property management and strategic upgrades that could support future rent growth.
  
  Now, answer this comparative question about {name}: {question}
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
  
  PROPERTY HISTORICAL DATA:
  Yearly Rents: {yearlyRents}
  Yearly Grades: {yearlyGrades}
  Yearly Rent Relative to Submarket (formula = propertyRent/submarketAverageRent): {yearlyPricePositions}
  
  INVESTMENT METRICS:
  Investment Metrics Summary: {investmentMetrics}
  
  INVESTMENT QUESTION: {question}
  
  Analyze this property's investment potential with this format:
  
  <investmentSummary>
  
  • <financialMetric1>
  • <financialMetric2>
  • <riskFactor>
  
  <investmentRecommendation>
  
  Be specific about ROI potential, risk factors, and use available metrics.
  Incorporate historical data trends (rent growth, grade changes, price positioning) in your analysis.
  
  EXAMPLES:
  
  Question: Is this a good investment property?
  Answer:
  Woodland Heights presents moderate investment potential with stable but not exceptional returns based on historical data and submarket trends.
  
  • Historical rent growth of 3.2% annually lags behind the submarket average of 4.5%, suggesting limited upside potential
  • Grade improvement from C+ to B between 2012-2020 indicates effective property management and potential for continued improvement
  • Risk factor: Price position has been consistently negative (-2.5% to -4.2%) relative to the submarket, indicating potential leasing challenges
  
  Consider this property if seeking stable cash flow rather than aggressive appreciation, with potential for value-add through strategic renovations to improve its submarket position.
  
  Question: What kind of ROI can I expect?
  Answer:
  Lakeview Apartments offers promising ROI metrics based on comprehensive historical performance data.
  
  • Average annual rent growth of 4.7% over the past 5 years exceeds the submarket average of 3.8%, suggesting strong income growth potential
  • Consistent positive price positioning (+2.3% to +5.1%) allows for premium rents without sacrificing occupancy
  • Risk factor: Property's grade plateaued at B+ since 2015, indicating potential need for capital improvements to achieve further rent growth
  
  This property represents a strong investment opportunity with above-average returns for the submarket, though some capital expenditure may be required to maintain its competitive position and achieve grade improvement.
  
  Now, analyze the investment potential of {name}: {question}
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
  
  PROPERTY HISTORICAL DATA:
  Yearly Rents: {yearlyRents}
  Yearly Grades: {yearlyGrades}
  Yearly Rent Relative to Submarket (formula = propertyRent/submarketAverageRent): {yearlyPricePositions}
  
  MARKET CONDITIONS:
  Rent Trends: {rentTrends}
  Rent Growth By Year: {rentGrowthByYear}
  Grade Distribution: {gradeDistribution}
  Market Summary: {marketConditions}
  
  MARKET QUESTION: {question}

  INSTRUCTIONS:
  1. First analyze the internal database information provided, including historical data trends.
  2. Then, supplement this with current web information about:
     - Current economic conditions affecting the {submarket} area
     - New construction or development projects near {address}
     - Recent rent trends in the broader market
     - Supply and demand dynamics in this submarket
  
  Provide market analysis with this structure:
  
  <Market Overview>
  Begin with a 1-2 sentence overview of the market conditions for this property.
  
  • <1 line max Trend Point 1>
  • <1 line max Trend Point 2 ONLY IF NEEDED>
  • <Competition Insight>
  
  <Concise 1 LINE MAX Market Prediction IF GOOD INSIGHTS available>
  
  Focus on specific market conditions relevant to this property and location.
  When discussing trends, analyze all available historical data (rents, grades, price positions).
  
  IMPORTANT: When you use information from web searches, include a citation using the format:
  [Source name](URL)
  
  EXAMPLES:
  
  Question: How is the market doing in this area?
  Answer:
  The East Austin submarket shows strong growth potential with a historical grade improvement from C+ (2010) to B+ (2020) and positive rent growth trends despite increasing competition.

  • Submarket rent growth has averaged 4.5% annually over the past decade, with this property maintaining a positive price position throughout [Austin Multi-Family Report](https://www.example.com/market-reports)
  • Property grade improvements have tracked with broader submarket improvements, suggesting well-timed capital investments
  • Competition remains moderate with only two comparable properties under construction within a 2-mile radius
  
  East Austin is projected to maintain above-average rent growth over the next 24 months as development struggles to meet demand and submarket grades continue to improve.
  
  Question: What's happening with construction in the market?
  Answer:
  The Round Rock submarket is experiencing moderate construction activity with selective development focused on higher-end properties, while maintaining stable grade distributions over the past 5 years.
  
  • New construction permits decreased 12% compared to last year, with most new properties targeting A-grade positioning [BuildCentral](https://www.buildcentral.com/construction-statistics-round-rock)
  • Property's consistent B+ grade since 2017 places it in the top 30% of the submarket, with minimal fluctuation in market grade distribution
  • Competition in this submarket is increasing but remains below metro average with a 0.67 competition score
  
  Development is expected to remain constrained through 2025, providing a favorable environment for existing B+ properties like this one to maintain their market position.
  
  Now, analyze the market conditions for {name} in {city}, {state}: {question}
`);

const irrelevantPrompt = PromptTemplate.fromTemplate(`
  You are a real estate analysis assistant focused on providing relevant property information.
  
  PROPERTY INFORMATION:
  Name: {name}
  Address: {address}
  City: {city}
  State: {state}
  
  IRRELEVANT QUESTION: {question}
  
  This question has been classified as irrelevant to real estate property analysis.
  
  Provide a polite and brief response explaining that you're focused on analyzing the property information above.
  Suggest a relevant alternative question the user could ask about this property.
  
  EXAMPLES:
  
  Question: Can you write me a poem about unicorns?
  Answer:
  I'm focused on providing real estate analysis for The Woodlands property. Instead, you might consider asking about recent rent trends, comparative market analysis, or investment potential for this property.
  
  Question: What's the best recipe for chocolate chip cookies?
  Answer:
  I'm here to analyze The Highland Apartments property data. I'd be happy to help with questions about this property's market position, historical performance, or investment metrics instead.
  
  Now, respond to this irrelevant question about {name}: {question}
`);

// Step 4: Create the chains for each question type
// Create chains with and without web search capability
const factChain = createAugmentedChain(factPrompt, false); // Facts don't need web search
const complexFactChain = createAugmentedChain(complexFactPrompt, true); // Complex facts use web search
const comparisonChain = createAugmentedChain(comparisonPrompt, true); // use web for comparison insights
const investmentChain = createAugmentedChain(investmentPrompt, true); // Use web for investment trends
const marketChain = createAugmentedChain(marketPrompt, true); // Use web for market insights
const irrelevantChain = createAugmentedChain(irrelevantPrompt, false); // No web search needed for irrelevant questions

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
    const factPromptData = {
      ...basePromptData,
      yearlyRents: JSON.stringify(contextData.yearlyRents || {}),
      yearlyGrades: JSON.stringify(contextData.yearlyGrades || {}),
      yearlyPricePositions: JSON.stringify(contextData.yearlyPricePositions || {})
    };
    logPromptData('fact', factPromptData);
    response = await factChain.invoke(factPromptData);
    break;
    
  case "COMPARISON":
    contextData = await fetchComparisonData(property);
    const comparisonPromptData = {
      ...basePromptData,
      yearlyRents: JSON.stringify(contextData.yearlyRents || {}),
      yearlyGrades: JSON.stringify(contextData.yearlyGrades || {}),
      yearlyPricePositions: JSON.stringify(contextData.yearlyPricePositions || {}),
      similarProperties: JSON.stringify(contextData.similarProperties || []),
      sameAgeProperties: JSON.stringify(contextData.sameAgeProperties || []),
      submarketAvgRents: JSON.stringify(contextData.submarketAvgRents || {}),
      submarketAvgGrades: JSON.stringify(contextData.submarketAvgGrades || {})
    };
    logPromptData('comparison', comparisonPromptData);
    response = await comparisonChain.invoke(comparisonPromptData);
    break;

  case "COMPLEX_FACT":
    contextData = await fetchFactData(property);
    const complexFactPromptData = {
      ...basePromptData,
      yearlyRents: JSON.stringify(contextData.yearlyRents || {}),
      yearlyGrades: JSON.stringify(contextData.yearlyGrades || {}),
      yearlyPricePositions: JSON.stringify(contextData.yearlyPricePositions || {})
    };
    logPromptData('complex_fact', complexFactPromptData);
    response = await complexFactChain.invoke(complexFactPromptData);
    break;
    
  case "INVESTMENT":
    contextData = await fetchInvestmentData(property);
    const investmentPromptData = {
      ...basePromptData,
      yearlyRents: JSON.stringify(contextData.yearlyRents || {}),
      yearlyGrades: JSON.stringify(contextData.yearlyGrades || {}),
      yearlyPricePositions: JSON.stringify(contextData.yearlyPricePositions || {}),
      investmentMetrics: JSON.stringify(contextData.investmentMetrics || {})
    };
    logPromptData('investment', investmentPromptData);
    response = await investmentChain.invoke(investmentPromptData);
    break;
    
  case "MARKET":
    contextData = await fetchMarketData(property);
    const marketPromptData = {
      ...basePromptData,
      yearlyRents: JSON.stringify(contextData.yearlyRents || {}),
      yearlyGrades: JSON.stringify(contextData.yearlyGrades || {}),
      yearlyPricePositions: JSON.stringify(contextData.yearlyPricePositions || {}),
      rentTrends: JSON.stringify(contextData.rentTrends || {}),
      rentGrowthByYear: JSON.stringify(contextData.rentGrowthByYear || {}),
      gradeDistribution: JSON.stringify(contextData.gradeDistribution || {}),
      marketConditions: JSON.stringify(contextData.marketConditions || {})
    };
    logPromptData('market', marketPromptData);
    response = await marketChain.invoke(marketPromptData);
    break;
  
  case "IRRELEVANT":
    // For irrelevant questions, we just need basic property info
    const irrelevantPromptData = {
      ...basePromptData
    };
    logPromptData('irrelevant', irrelevantPromptData);
    response = await irrelevantChain.invoke(irrelevantPromptData);
    break;
    
  default:
    // Fallback to comparison as the default
    contextData = await fetchComparisonData(property);
    const defaultPromptData = {
      ...basePromptData,
      yearlyRents: JSON.stringify(contextData.yearlyRents || {}),
      yearlyGrades: JSON.stringify(contextData.yearlyGrades || {}),
      yearlyPricePositions: JSON.stringify(contextData.yearlyPricePositions || {}),
      similarProperties: JSON.stringify(contextData.similarProperties || []),
      sameAgeProperties: JSON.stringify(contextData.sameAgeProperties || []),
      submarketAvgRents: JSON.stringify(contextData.submarketAvgRents || {}),
      submarketAvgGrades: JSON.stringify(contextData.submarketAvgGrades || {})
    };
    logPromptData('default', defaultPromptData);
    response = await comparisonChain.invoke(defaultPromptData);
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


// Add at the bottom of the file after your POST handler

// Keep-warm function to prevent cold starts and pre-initialize web search
export async function GET() {
  try {
    console.log("Prewarming property-insights API");
    
    // Prepare a simple warmup prompt for the classification model
    await classifierLLM.invoke("Classify this warmup text");
    
    // Initialize the main model
    await llm.invoke("Give me analysis on leasup market in Texas and Ohio");
    
    // Initialize the web search model with a minimal query - this is the critical part
    // We'll use a timeout to prevent hanging
    const webSearchPromise = webSearchEnabledLLM.invoke({
      content: "Initialize web search capabilities for property analysis"
    });
    
    // Only wait 5 seconds max for web search warmup - this prevents deployment from timing out
    const webSearchResult = await Promise.race([
      webSearchPromise,
      new Promise((resolve) => setTimeout(() => resolve({ status: "timeout" }), 5000))
    ]);
    
    console.log("API prewarm complete, web search status:", 
      webSearchResult.status || "initialized");
    
    return new Response(JSON.stringify({ 
      status: "ready",
      message: "Property insights API is warmed up and ready for queries"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('API warmup error:', error);
    return new Response(JSON.stringify({ 
      status: "partially-initialized",
      error: error.message
    }), {
      status: 200, // Still return 200 to prevent deployment errors
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
// Add this logging helper at the top of your file, just below your imports

// Helper function to log data while handling large objects with circular references
function logPromptData(type, data) {
  console.log(`\n----- ${type.toUpperCase()} PROMPT DATA -----`);
  
  // First log basic property info
  if (data.name) console.log(`Property: ${data.name} (${data.city}, ${data.state})`);
  if (data.submarket) console.log(`Submarket: ${data.submarket}`);
  
  // Log sample of yearly data if available
  if (data.yearlyRents) {
    const rentData = JSON.parse(data.yearlyRents);
    const rentYears = Object.keys(rentData).sort();
    console.log(`\nRent data available for years: ${rentYears.join(', ')}`);
    if (rentYears.length > 0) {
      const latestYear = rentYears[rentYears.length - 1];
      console.log(`Latest rent (${latestYear}): ${rentData[latestYear]}`);
    }
  }
  
  if (data.yearlyGrades) {
    const gradeData = JSON.parse(data.yearlyGrades);
    const yearsWithGrades = Object.keys(gradeData)
      .filter(year => gradeData[year] !== "N/A")
      .sort();
    console.log(`\nGrade data available for years: ${yearsWithGrades.join(', ')}`);
    if (yearsWithGrades.length > 0) {
      const latestYear = yearsWithGrades[yearsWithGrades.length - 1];
      console.log(`Latest grade (${latestYear}): ${gradeData[latestYear]}`);
    }
  }
  
  if (data.yearlyPricePositions) {
    const priceData = JSON.parse(data.yearlyPricePositions);
    const yearsWithPrices = Object.keys(priceData)
      .filter(year => priceData[year] !== "N/A")
      .sort();
    console.log(`\nPrice position data available for years: ${yearsWithPrices.join(', ')}`);
    if (yearsWithPrices.length > 0) {
      const latestYear = yearsWithPrices[yearsWithPrices.length - 1];
      console.log(`Latest price position (${latestYear}): ${priceData[latestYear]}`);
    }
  }
  
  // Log comparison data if available
  if (data.similarProperties) {
    const properties = JSON.parse(data.similarProperties);
    console.log(`\nSimilar properties in submarket: ${properties.length}`);
    if (properties.length > 0) {
      console.log(`Example property: ${properties[0].Name || properties[0].title || 'Unnamed'}`);
    }
  }
  
  if (data.submarketAvgRents) {
    const submarketRents = JSON.parse(data.submarketAvgRents);
    const years = Object.keys(submarketRents).sort();
    console.log(`\nSubmarket average rents available for: ${years.join(', ')}`);
    if (years.length > 0) {
      const latestYear = years[years.length - 1];
      console.log(`Latest submarket avg rent (${latestYear}): $${submarketRents[latestYear].toFixed(2)}`);
    }
  }
  
  // Log investment metrics if available
  if (data.investmentMetrics) {
    const metrics = JSON.parse(data.investmentMetrics);
    console.log('\nInvestment metrics:');
    if ('annualRentGrowth' in metrics) console.log(`- Annual rent growth: ${metrics.annualRentGrowth.toFixed(2)}%`);
    if ('gradeImprovement' in metrics) console.log(`- Grade trend: ${metrics.gradeImprovement}`);
    if ('avgPricePosition' in metrics) console.log(`- Avg price position: ${metrics.avgPricePosition.toFixed(2)}%`);
    
    if (metrics.submarketRentGrowth) {
      console.log(`- Submarket annual growth: ${metrics.submarketRentGrowth.annual.toFixed(2)}%`);
    }
  }
  
  // Log market data if available
  if (data.marketConditions) {
    const marketData = JSON.parse(data.marketConditions);
    console.log('\nMarket conditions:');
    if ('currentAvgRent' in marketData) console.log(`- Current avg rent: $${marketData.currentAvgRent.toFixed(2)}`);
    if ('recentRentGrowth' in marketData) console.log(`- Recent rent growth: ${marketData.recentRentGrowth.toFixed(2)}%`);
    if ('dominantGrade' in marketData) console.log(`- Dominant grade: ${marketData.dominantGrade}`);
  }
  
  console.log(`\nQuestion: "${data.question}"`);
  console.log("----- END PROMPT DATA -----\n");
}
