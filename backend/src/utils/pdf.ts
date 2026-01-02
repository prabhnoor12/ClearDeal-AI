

import { PDFDocument, StandardFonts, rgb,  } from 'pdf-lib';


/**
 * Generates a PDF buffer from plain text content, supporting multi-page output.
 * @param content The text content to include in the PDF.
 * @param options Optional metadata and config.
 * @returns Buffer containing the PDF file.
 */
export async function generatePdfFromText(
	content: string,
	options?: {
		title?: string;
		author?: string;
		subject?: string;
		keywords?: string[];
		fontSize?: number;
		margin?: number;
	}
): Promise<Buffer> {
	const pdfDoc = await PDFDocument.create();
	if (options?.title) pdfDoc.setTitle(options.title);
	if (options?.author) pdfDoc.setAuthor(options.author);
	if (options?.subject) pdfDoc.setSubject(options.subject);
	if (options?.keywords) pdfDoc.setKeywords(options.keywords);

	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const fontSize = options?.fontSize || 12;
	const margin = options?.margin || 40;
	const pageWidth = 595.28;
	const pageHeight = 841.89;
	const lineHeight = fontSize * 1.33;
	const maxWidth = pageWidth - 2 * margin;

	// Split content into lines that fit the page width
	const lines = wrapText(content, font, fontSize, maxWidth);
	let currentLine = 0;
	while (currentLine < lines.length) {
		const page = pdfDoc.addPage([pageWidth, pageHeight]);
		let y = pageHeight - margin - fontSize;
		while (y > margin && currentLine < lines.length) {
			const line = lines[currentLine];
			if (line !== undefined) {
				page.drawText(line, {
					x: margin,
					y,
					size: fontSize,
					font,
					color: rgb(0, 0, 0),
				});
			}
			y -= lineHeight;
			currentLine++;
		}
	}
	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

/**
 * Helper to wrap text into lines that fit the page width.
 */
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let line = '';
	for (const word of words) {
		const testLine = line ? line + ' ' + word : word;
		const width = font.widthOfTextAtSize(testLine, fontSize);
		if (width > maxWidth && line) {
			lines.push(line);
			line = word;
		} else {
			line = testLine;
		}
	}
	if (line) lines.push(line);
	return lines;
}

/**
 * Embeds an image (PNG or JPEG) into a new PDF page.
 * @param imageBuffer Buffer of the image file.
 * @param options Optional config for image placement.
 * @returns Buffer containing the PDF file.
 */
export async function generatePdfFromImage(
	imageBuffer: Buffer,
	options?: {
		title?: string;
		author?: string;
		x?: number;
		y?: number;
		width?: number;
		height?: number;
	}
): Promise<Buffer> {
	const pdfDoc = await PDFDocument.create();
	if (options?.title) pdfDoc.setTitle(options.title);
	if (options?.author) pdfDoc.setAuthor(options.author);
	let image;
	if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) {
		image = await pdfDoc.embedPng(imageBuffer);
	} else {
		image = await pdfDoc.embedJpg(imageBuffer);
	}
	const page = pdfDoc.addPage([595.28, 841.89]);
	const x = options?.x ?? 40;
	const y = options?.y ?? 40;
	const width = options?.width ?? 400;
	const height = options?.height ?? 400;
	page.drawImage(image, { x, y, width, height });
	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}
