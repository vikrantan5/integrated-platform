// lib/pdf-utils-alt.ts
import PDFParser from 'pdf2json';

// Define interfaces for better type safety
interface PDFErrorData {
  parserError?: Error;
  message?: string;
}

interface PDFTextElement {
  R: Array<{ T: string }>;
}

interface PDFPage {
  Texts: PDFTextElement[];
}

interface PDFData {
  Pages: PDFPage[];
}

export async function extractTextFromPDFAlt(fileBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataError', (errData: PDFErrorData | Error) => {
      // Handle different error formats
      let errorMessage = 'Unknown PDF parsing error';
      
      if (errData instanceof Error) {
        errorMessage = errData.message;
      } else if (errData?.parserError) {
        errorMessage = errData.parserError.message;
      } else if (errData?.message) {
        errorMessage = errData.message;
      }
      
      reject(new Error(`PDF parsing error: ${errorMessage}`));
    });
    
    pdfParser.on('pdfParser_dataReady', (pdfData: PDFData) => {
      try {
        // Extract text from all pages
        if (!pdfData?.Pages || !Array.isArray(pdfData.Pages)) {
          throw new Error('Invalid PDF data structure: missing Pages array');
        }

        const text = pdfData.Pages.map((page: PDFPage) => {
          if (!page?.Texts || !Array.isArray(page.Texts)) {
            return '';
          }
          
          return page.Texts.map((textItem: PDFTextElement) => {
            try {
              // Safely access nested properties
              if (textItem?.R?.[0]?.T) {
                return decodeURIComponent(textItem.R[0].T);
              }
              return '';
            } catch (decodeError) {
              console.warn('Error decoding text:', decodeError);
              return '';
            }
          }).join(' ');
        }).join('\n');
        
        // Clean up the text
        const cleanedText = text
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim();
        
        if (!cleanedText) {
          reject(new Error('No text content extracted from PDF'));
        } else {
          resolve(cleanedText);
        }
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse PDF data'));
      }
    });
    
    // Parse the buffer
    try {
      pdfParser.parseBuffer(fileBuffer);
    } catch (error) {
      reject(new Error(`Failed to start PDF parsing: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

// Helper function to validate PDF
export function isValidPDF(buffer: Buffer): boolean {
  try {
    const header = buffer.toString('ascii', 0, 5);
    return header === '%PDF-';
  } catch (error) {
    console.error('Error validating PDF:', error);
    return false;
  }
}