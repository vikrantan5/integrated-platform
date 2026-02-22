// lib/pdf-utils-alt.ts
import PDFParser from 'pdf2json';

export async function extractTextFromPDFAlt(fileBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataError', (errData) => {
      reject(new Error(`PDF parsing error: ${errData.parserError}`));
    });
    
    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      try {
        // Extract text from all pages
        const text = pdfData.Pages.map((page: any) => {
          return page.Texts.map((text: any) => {
            return decodeURIComponent(text.R[0].T);
          }).join(' ');
        }).join('\n');
        
        resolve(text);
      } catch (error) {
        reject(error);
      }
    });
    
    pdfParser.parseBuffer(fileBuffer);
  });
}