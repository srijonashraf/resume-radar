import * as pdfjs from 'pdfjs-dist';

// Configure worker using URL
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

/**
 * Extract text from a PDF file
 * @param file PDF file to extract text from
 * @returns Promise resolving to the extracted text
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    // Read the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load the PDF document
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    // Extract text from each page
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
};


