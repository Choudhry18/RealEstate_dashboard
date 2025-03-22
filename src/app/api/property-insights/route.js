import { createClient } from '@/utils/supabase/client';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

const supabase = createClient();

// Initialize OpenAI client
const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.2,
});

// Helper function to fetch comparative data
async function fetchComparativeData(property) {
  // Fetch similar properties in the same submarket
  const { data: similarProperties } = await supabase
    .from('properties')
    .select('*')
    .eq('Submarket', property.Submarket)
    .neq('Property_ID', property.Property_ID)
    .limit(5);
    
//   // Fetch submarket averages
//   const { data: submarketAverages } = await supabase
//     .rpc('get_submarket_averages', { submarket_name: property.Submarket });
    
  // Fetch year-based comparisons
  const yearRange = 5;
  const constructionYearLow = parseInt(property.YearBuilt) - yearRange;
  const constructionYearHigh = parseInt(property.YearBuilt) + yearRange;
  
  const { data: sameAgeProperties } = await supabase
    .from('properties')
    .select('*')
    .gte('year_built', constructionYearLow)
    .lte('year_built', constructionYearHigh)
    .limit(5);

  return {
    similarProperties: similarProperties || [],
    // submarketAverages: submarketAverages || {},
    sameAgeProperties: sameAgeProperties || []
  };
}

// Create prompt template
const promptTemplate = PromptTemplate.fromTemplate(`
You are a real estate analyst providing insights about a specific property.

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
Similar Properties: {similarProperties}
Same Age Properties: {sameAgeProperties}

USER QUESTION:
{question}

Analyze this property and provide insights based on the available data. Focus on answering the user's specific question while providing relevant context. 
Make direct comparisons to similar properties whenever possible and same age properties.
Use specific numbers and percentages when they're available.
If the user asks about something that isn't covered in the data, acknowledge the limitation but provide your best estimate based on the available information.

FORMAT YOUR RESPONSE:
1. Direct answer to the question (1-2 sentences)
2. Supporting data points with comparisons (2-3 bullet points)
3. Brief conclusion with actionable insight (1 sentence)
`);

// Create the chain
const chain = RunnableSequence.from([
  promptTemplate,
  llm,
  new StringOutputParser()
]);

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
    
    // Fetch comparative data for this property
    const comparativeData = await fetchComparativeData(property);
    
    // Prepare data for the prompt
    const promptData = {
      name: property.Name,
      address: property.Address,
      city: property.City,
      state: property.State,
      yearBuilt: property.year_built,
      units: property.quantity,
      levels: property.level,
      submarket: property.submarket,
      similarProperties: JSON.stringify(comparativeData.similarProperties),
    //   submarketAverages: JSON.stringify(comparativeData.submarketAverages),
      sameAgeProperties: JSON.stringify(comparativeData.sameAgeProperties),
      question: question
    };
    
    // Run the chain
    const response = await chain.invoke(promptData);
    
    return new Response(JSON.stringify({ 
      response,
      property,
      comparativeData: {
        similarPropertiesCount: comparativeData.similarProperties.length,
        sameAgePropertiesCount: comparativeData.sameAgeProperties.length
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