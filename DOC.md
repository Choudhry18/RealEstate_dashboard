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

This classification uses a lightweight model (`gpt-4o-mini`) to efficiently route questions to the appropriate specialized prompt.

```javascript
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