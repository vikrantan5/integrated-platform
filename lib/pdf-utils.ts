// lib/pdf-utils.ts

export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  try {
    let pdfParse;
    
    // Try dynamic import with type assertion
    try {
      const module = await import('pdf-parse');
      // Use type assertion to tell TypeScript this might have a default property
      pdfParse = (module as any).default || module;
      
      // If it's still not a function, try to access nested default
      if (typeof pdfParse !== 'function' && (pdfParse as any)?.default) {
        pdfParse = (pdfParse as any).default;
      }
    } catch (importError) {
      console.warn('Dynamic import failed, falling back to require:', importError);
      pdfParse = require('pdf-parse');
    }
    
    // Validate that we got a function
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse did not export a function');
    }
    
    // Configure options
    const options = {
      max: 1000000,
    };
    
    // Parse the PDF
    const data = await pdfParse(fileBuffer, options);
    
    if (!data || !data.text) {
      throw new Error('No text content extracted from PDF');
    }
    
    // Clean up the text
    const cleanedText = data.text
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n\r\t]/g, '')
      .trim();
    
    if (cleanedText.length === 0) {
      throw new Error('Extracted text is empty');
    }
    
    return cleanedText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}





// PDF parsing requires additional setup. Please try a different PDF or convert it to text format first.