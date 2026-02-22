// lib/pdf-utils.ts
import { readFile } from 'fs/promises';

// Cache the pdf-parse module to avoid repeated loading
let pdfParseModule: any = null;

async function getPdfParse() {
  if (!pdfParseModule) {
    try {
      // Try dynamic import first
      pdfParseModule = await import('pdf-parse').then(module => module.default || module);
    } catch (error) {
      // Fallback to require
      pdfParseModule = require('pdf-parse');
    }
  }
  return pdfParseModule;
}

export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  try {
    const pdfParse = await getPdfParse();
    
    // Configure options for better compatibility
    const options = {
      max: 1000000, // Max number of pages to parse
      pagerender: undefined, // Use default page renderer
    };
    
    const data = await pdfParse(fileBuffer, options);
    
    if (!data || !data.text) {
      throw new Error('No text content extracted from PDF');
    }
    
    // Clean up the text
    const cleanedText = data.text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-printable characters
      .trim();
    
    if (cleanedText.length === 0) {
      throw new Error('Extracted text is empty');
    }
    
    return cleanedText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    
    // Check if it's a DOM-related error
    if (error instanceof Error && 
        (error.message.includes('DOMMatrix') || 
         error.message.includes('ImageData') || 
         error.message.includes('Path2D'))) {
      throw new Error(
        'PDF parsing requires additional browser APIs. ' +
        'Please ensure your environment is properly configured. ' +
        'Try using a different PDF or convert it to text format first.'
      );
    }
    
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to check if a file is a valid PDF
export function isValidPDF(buffer: Buffer): boolean {
  // Check PDF header (starts with %PDF-)
  const header = buffer.toString('ascii', 0, 5);
  return header === '%PDF-';
}