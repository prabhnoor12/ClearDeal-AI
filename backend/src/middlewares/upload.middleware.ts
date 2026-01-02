import multer, { StorageEngine, FileFilterCallback } from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';


const storage: StorageEngine = multer.diskStorage({
	destination: (
		_req: Request,
		_file: Express.Multer.File,
		cb: (error: Error | null, destination: string) => void
	) => {
		cb(null, path.join(process.cwd(), 'uploads'));
	},
	filename: (
		_req: Request,
		file: Express.Multer.File,
		cb: (error: Error | null, filename: string) => void
	) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		cb(null, uniqueSuffix + '-' + file.originalname);
	},
});


const allowedMimeTypes = [
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const fileFilter = (
	_req: Request,
	file: Express.Multer.File,
	cb: FileFilterCallback
) => {
	if (allowedMimeTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error('Only PDF and DOC/DOCX files are allowed'));
	}
};


export const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * Middleware to handle upload errors and provide robust feedback.
 */
export function uploadErrorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
	if (err instanceof multer.MulterError) {
		// Multer-specific errors
		return res.status(400).json({ status: 'error', message: err.message });
	} else if (err) {
		// Other errors
		return res.status(400).json({ status: 'error', message: err.message || 'File upload error' });
	}
	return next();
}

// Usage in routes:
// router.post('/upload', upload.single('file'), uploadErrorHandler, handler)
// router.post('/multi-upload', upload.array('files', 5), uploadErrorHandler, handler)

// Usage in routes: router.post('/upload', upload.single('file'), handler)
