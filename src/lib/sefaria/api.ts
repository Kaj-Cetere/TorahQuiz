// Constants for the Sefaria API
const SEFARIA_API_BASE_URL = 'https://www.sefaria.org/api';

/**
 * Fetch a text from Sefaria by its reference
 * @param ref - The reference to the text, e.g. "Genesis.1" or "Berakhot.2a"
 * @returns The text data from Sefaria
 */
export async function fetchText(ref: string) {
  try {
    const response = await fetch(`${SEFARIA_API_BASE_URL}/texts/${encodeURIComponent(ref)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch text: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching text from Sefaria:', error);
    throw error;
  }
}

/**
 * Get the index information for a text, including its structure and length
 * @param title - The title of the text, e.g. "Genesis" or "Berakhot"
 * @returns Index information about the text
 */
export async function fetchTextIndex(title: string) {
  try {
    const response = await fetch(
      `${SEFARIA_API_BASE_URL}/index/${encodeURIComponent(title)}?with_content_counts=1`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch index: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching index from Sefaria:', error);
    throw error;
  }
}

/**
 * Search for texts in Sefaria
 * @param query - The search query
 * @returns Search results
 */
export async function searchTexts(query: string) {
  try {
    const response = await fetch(
      `${SEFARIA_API_BASE_URL}/search-wrapper?query=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to search texts: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error searching texts in Sefaria:', error);
    throw error;
  }
} 

