# Affinius Dashboard AI Documentation

## AI Architecture Overview

The Affinius Dashboard leverages a sophisticated AI system for property analysis, built around a multi-agent prompting architecture that specializes in different types of real estate inquiries. The system processes natural language questions about properties and generates detailed, structured insights using both historical property data and augmented web search capabilities.

## Core AI Components

### 1. Question Classification System

The system begins by classifying incoming questions into four specialized categories:

- **FACT**: Simple factual questions about property details
- **COMPARISON**: Questions comparing the property to others in the market
- **INVESTMENT**: Questions about investment potential, ROI, or value
- **MARKET**: Questions about market trends, predictions, or conditions

This classification uses a lightweight model (`gpt-4o-mini`) by OpenAI to efficiently route questions to the appropriate specialized prompt.

```javascript
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
```

### 2. Specialized Data Retrieval

Each question type triggers a specific data retrieval strategy that fetches onlly the data relevant to answering that particular question type: 

- **fetchFactData()**: Retrieves basic property facts
- **fetchComparisonData()**: Gathers similar properties in the same submarket and properties of similar age
- **fetchInvestmentData()**: Collects historical performance metrics and calculates investment indicators
- **fetchMarketData()**: Assembles market trend data including rent growth, grade distribution, and market conditions

This targeted approach ensures the LLM receives the most relevant context while minimizing token usage.

### 3. Specialized Prompts

The system uses four specialized prompts engineered for different question types and model used is (`gpt-4o`) by OpenAI:

``` javascript

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

```

### 4. Web Search Integration 

For questions requiring current market information or information that is not in the provided data but would help provide more context, the system selectively employs web search capabilities. In this case a template giving basic information about the propery is prepended to the base prompt that instructs the AI model on what to search and how to use those results. This helps balance the insights from the web with the insights from the database data. The prompt also instructs the model to give sources that are presented to the user which helps with reliability and authenticity. 

``` javascript 

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

```

## Prompt Engineering Techniques Used 

### 1. Few-Shot learning with Structured Templates

Each prompt includes carefully crafted examples that demonstrate the expected response format and reasoning process. These examples use real estate-specific language and metrics, teaching the model to focus on relevant insights and maintain industry-appropriate terminology.

### 2. Response Structure Enforcement

Each prompt contains explicit instructions for formatting responses consistently:

```
Provide market analysis with this structure:

<Market Overview>
Begin with a 1-2 sentence overview of the market conditions for this property.

• <1 line max Trend Point 1>
• <1 line max Trend Point 2 ONLY IF NEEDED>
• <Competition Insight>

<Concise 1 LINE MAX Market Prediction IF GOOD INSIGHTS available>
```

This strict formatting guidance ensures responses are scannable, professional, and actionable for real estate professionals.

### 3. Data-Grounded Reasoning

Prompts explicitly request analysis based on the provided historical data:

```
When discussing trends, analyze all available historical data (rents, grades, price positions).
```

This instruction forces the model to ground its reasoning in the actual property performance data rather than making generic statements.

### 4. Fallback Machanisms

The system implements graceful degradation through data fallbacks - for example, if rent data is missing for a year, it's marked as "Property not leased yet" rather than returning null values. This prevents the model from making incorrect assumptions about missing data.

## Technical Integration Flow

1. User clicks property on map and asks a question
2. Question is classified by the classifier model
3. Specialized data for that question type is retrieved
4. The appropriate prompt template is populated with data
5. The LLM (with or without web search) generates a response
6. Response is formatted and displayed in the UI

<br/><br/>
<br/><br/>


# GenAI tools used 

Throughout the development of the Affinius Dashboard, several GenAI tools were leveraged to accelerate development, solve technical challenges, and improve implementation quality:

## GitHub Copilot

GitHub Copilot was extensively used for both code generation and debugging:

1. **Function Implementation**: Copilot helped implement complex data processing functions by understanding requirements expressed in natural language. Example prompts included:
   - "Implement a function that would take a dataframe with columns {property_id, year, rent, grade} and return a dataframe with yearly_averages"
   - "Create a data transformation that converts the nested grade history into a year-over-year comparison"
   - "Implement a function in javascript to connect to SupaBase client and fetch from rent_growth table where submarket is equal to property submarket

2. **Debugging Assistance**: When facing issues with database queries or component rendering, Copilot helped diagnose and resolve problems:
   - "Why is my submarket_grade query returning null despite the property name existing in the database?"
   - "Fix the column name casing issue in the database query"

3. **Prompt Engineering**: Copilot assisted in refining the AI prompt templates for better response quality and consistency.

## Mapbox Ask AI

The Mapbox interactive map implementation was significantly accelerated by using [Mapbox Ask AI](https://docs.mapbox.com/ask-ai/):

1. **Custom Layer Implementation**: Generated code for property location markers and custom popups
2. **Event Handling**: Helped implement the property selection and click interactions
3. **Performance Optimization**: Provided guidance on efficiently rendering large datasets of property locations

## OpenAI Tools

OpenAI's tools were used in two principal ways:

1. **Prompt Development**: ChatGPT was used to iteratively refine prompt templates, particularly for the few-shot examples that demonstrate the desired response format
2. **Data Processing Logic**: Helped conceptualize the design of specialized data retrieval functions for different question types

These GenAI tools significantly reduced development time while improving code quality and enabling more sophisticated features than would have been practical to implement within the project timeline using traditional development approaches alone.