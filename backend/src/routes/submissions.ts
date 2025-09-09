import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit per file
        files: 10, // Maximum 10 files per request
        fieldSize: 2 * 1024 * 1024, // 2MB field size limit
    },
    fileFilter: (req, file, cb) => {
        // Allow images and common document formats
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and documents are allowed.'));
        }
    }
});

// Validation schemas
const createSubmissionSchema = z.object({
    student_id: z.string().min(1, 'Student ID is required'),
    full_name: z.string().optional(),
    submission_type: z.enum(['screenshot', 'github_repo', 'project']),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    github_url: z.string().url().optional(),
    lesson_id: z.string().optional(),
    project_type: z.enum(['midterm', 'final']).optional(),
    is_public: z.string().transform(val => val === 'true').optional()
});

const getSubmissionsSchema = z.object({
    student_id: z.string().optional(),
    submission_type: z.enum(['screenshot', 'github_repo', 'project']).optional(),
    lesson_id: z.string().optional(),
    project_type: z.enum(['midterm', 'final']).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional()
});

const updateProjectSchema = z.object({
    student_id: z.string().min(1, 'Student ID is required'),
    title: z.string().min(1, 'Title is required').optional(),
    description: z.string().optional(),
    github_url: z.string().url('Invalid GitHub URL').optional(),
    is_public: z.string().transform(val => val === 'true').optional()
});

// Helper function to ensure student exists
async function ensureStudentExists(studentId: string, fullName?: string) {
    try {
        // Check if student exists
        const { data: existingStudent } = await supabase
            .from('students')
            .select('id')
            .eq('student_id', studentId)
            .single();

        if (existingStudent) {
            return existingStudent.id;
        }

        // Create new student if they don't exist
        const { data: newStudent, error } = await supabase
            .from('students')
            .insert({
                student_id: studentId,
                full_name: fullName || studentId
            })
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        return newStudent.id;
    } catch (error) {
        console.error('Error ensuring student exists:', error);
        throw error;
    }
}

// Helper function to upload file to Supabase Storage
async function uploadFileToStorage(file: Express.Multer.File, studentId: string): Promise<string> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${studentId}/${uuidv4()}${fileExtension}`;
    
    const { data, error } = await supabase.storage
        .from('submissions')
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) {
        console.error('Storage upload error:', error);
        throw new Error('Failed to upload file to storage');
    }

    return fileName;
}

// Helper function to save multiple files to submission_files table
async function saveSubmissionFiles(submissionId: number, files: { path: string, name: string, size: number, mimeType: string }[]) {
    const fileRecords = files.map((file, index) => ({
        submission_id: submissionId,
        file_path: file.path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.mimeType,
        file_order: index
    }));

    const { data, error } = await supabase
        .from('submission_files')
        .insert(fileRecords)
        .select();

    if (error) {
        console.error('Error saving submission files:', error);
        throw new Error('Failed to save file records');
    }

    return data;
}

// Helper function to get all files for submissions with URLs
async function getSubmissionFiles(submissionIds: number[]) {
    if (submissionIds.length === 0) return {};

    const { data: files, error } = await supabase
        .from('submission_files')
        .select('*')
        .in('submission_id', submissionIds)
        .order('submission_id', { ascending: true })
        .order('file_order', { ascending: true });

    if (error) {
        console.error('Error fetching submission files:', error);
        return {};
    }

    // Group files by submission_id and add URLs
    const filesBySubmission: { [key: number]: any[] } = {};
    
    files.forEach(file => {
        if (!filesBySubmission[file.submission_id]) {
            filesBySubmission[file.submission_id] = [];
        }

        const { data: urlData } = supabase.storage
            .from('submissions')
            .getPublicUrl(file.file_path);

        filesBySubmission[file.submission_id].push({
            ...file,
            file_url: urlData.publicUrl
        });
    });

    return filesBySubmission;
}

// Error handling middleware for multer errors
const handleMulterError = (error: any, req: Request, res: Response, next: any) => {
    if (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large',
                message: 'Each file must be smaller than 20MB. Please compress your images or choose smaller files.',
                details: {
                    field: error.field,
                    limit: '20MB per file'
                }
            });
        }
        
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Too many files',
                message: 'Maximum 10 files allowed per upload.',
                details: {
                    limit: '10 files maximum'
                }
            });
        }
        
        if (error.code === 'LIMIT_FIELD_VALUE') {
            return res.status(400).json({
                success: false,
                error: 'Field value too large',
                message: 'Form field values are too large.',
                details: {
                    limit: '2MB per field'
                }
            });
        }
        
        if (error.message && error.message.includes('Invalid file type')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid file type',
                message: 'Only image files (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX, TXT) are allowed.',
                details: {
                    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
                }
            });
        }
        
        // Generic multer error
        return res.status(400).json({
            success: false,
            error: 'File upload error',
            message: 'There was an error processing your file upload. Please try again.',
            details: {
                code: error.code,
                message: error.message
            }
        });
    }
    
    next();
};

// POST /api/submissions - Create a new submission
router.post('/', upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'file_0', maxCount: 1 },
    { name: 'file_1', maxCount: 1 },
    { name: 'file_2', maxCount: 1 },
    { name: 'file_3', maxCount: 1 },
    { name: 'file_4', maxCount: 1 }
]), handleMulterError, async (req: Request, res: Response) => {
    try {
        const validation = createSubmissionSchema.safeParse(req.body);
        
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request data',
                details: validation.error.issues
            });
        }

        const { student_id, full_name, submission_type, title, description, github_url, lesson_id, project_type, is_public } = validation.data;

        // Get semester info from header or use current semester
        const semesterCode = req.headers['x-semester-code'] as string;
        let semesterId = null;
        
        if (semesterCode) {
            // Get semester ID from code
            const { data: semester } = await supabase
                .from('semesters')
                .select('id')
                .eq('code', semesterCode)
                .eq('is_active', true)
                .single();
            
            if (semester) {
                semesterId = semester.id;
            }
        } else {
            // Use current semester if no header provided
            const { data: currentSemester } = await supabase
                .from('semesters')
                .select('id')
                .eq('is_current', true)
                .eq('is_active', true)
                .single();
            
            if (currentSemester) {
                semesterId = currentSemester.id;
            }
        }

        // Ensure student exists
        const studentUuid = await ensureStudentExists(student_id, full_name);

        let filePath = null;
        let fileName = null;
        let fileSize = null;
        let mimeType = null;

        // Handle multiple file uploads if present
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        let uploadedFiles: Express.Multer.File[] = [];

        if (files) {
            // Collect all uploaded files from different field names
            uploadedFiles = [
                ...(files.file || []),
                ...(files.file_0 || []),
                ...(files.file_1 || []),
                ...(files.file_2 || []),
                ...(files.file_3 || []),
                ...(files.file_4 || [])
            ];
        }

        let uploadedFileRecords: { path: string, name: string, size: number, mimeType: string }[] = [];

        if (uploadedFiles.length > 0 && (submission_type === 'screenshot' || submission_type === 'project')) {
            try {
                // Upload all files to storage
                for (const file of uploadedFiles) {
                    const storagePath = await uploadFileToStorage(file, student_id);
                    uploadedFileRecords.push({
                        path: storagePath,
                        name: file.originalname,
                        size: file.size,
                        mimeType: file.mimetype
                    });
                }

                // For backward compatibility, store the first file in the original columns
                if (uploadedFileRecords.length > 0) {
                    const firstFile = uploadedFileRecords[0];
                    filePath = firstFile.path;
                    fileName = firstFile.name;
                    fileSize = firstFile.size;
                    mimeType = firstFile.mimeType;
                }
            } catch (uploadError) {
                console.error('File upload failed:', uploadError);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to upload files',
                    message: 'File upload to storage failed'
                });
            }
        }

        // Validate required fields based on submission type
        if ((submission_type === 'github_repo' || submission_type === 'project') && !github_url) {
            return res.status(400).json({
                success: false,
                error: 'GitHub URL is required for github_repo and project submission types'
            });
        }

        // Validate that file is provided for screenshot type
        if (submission_type === 'screenshot' && uploadedFiles.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'File is required for screenshot submission type'
            });
        }

        // Validate project type for project submissions
        if (submission_type === 'project' && !project_type) {
            return res.status(400).json({
                success: false,
                error: 'Project type (midterm or final) is required for project submissions'
            });
        }

        // Check for duplicate project submissions (within the same semester)
        if (submission_type === 'project' && project_type) {
            const query = supabase
                .from('submissions')
                .select('id, title, created_at')
                .eq('student_id', student_id)
                .eq('submission_type', 'project')
                .eq('project_type', project_type);
            
            // Only check within the same semester if semesterId exists
            if (semesterId) {
                query.eq('semester_id', semesterId);
            }
                
            const { data: existingProject, error: checkError } = await query.single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error checking for duplicate project:', checkError);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to validate project submission',
                    message: 'Could not check for existing projects'
                });
            }

            if (existingProject) {
                return res.status(409).json({
                    success: false,
                    error: 'Duplicate project submission',
                    message: `You have already submitted a ${project_type} project titled "${existingProject.title}". Each student can only submit one ${project_type} project.`,
                    details: {
                        existing_project: {
                            id: existingProject.id,
                            title: existingProject.title,
                            submitted_at: existingProject.created_at
                        },
                        suggestion: 'You can delete your existing project and submit a new one, or add screenshots to your current project.'
                    }
                });
            }
        }

        // Create submission record
        const { data: submission, error: submissionError } = await supabase
            .from('submissions')
            .insert({
                student_id,
                student_uuid: studentUuid,
                submission_type,
                title,
                description,
                file_path: filePath,
                file_name: fileName,
                file_size: fileSize,
                mime_type: mimeType,
                github_url,
                lesson_id,
                project_type,
                is_public: is_public || false,
                semester_id: semesterId
            })
            .select(`
                *,
                students!inner(full_name)
            `)
            .single();

        if (submissionError) {
            console.error('Submission creation error:', submissionError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create submission',
                message: submissionError.message
            });
        }

        // Save multiple files to submission_files table
        if (uploadedFileRecords.length > 0) {
            try {
                await saveSubmissionFiles(submission.id, uploadedFileRecords);
            } catch (fileError) {
                console.error('Failed to save file records:', fileError);
                // Continue with response even if file records fail to save
            }
        }

        // Generate public URL for file if uploaded
        let fileUrl = null;
        if (filePath) {
            const { data: urlData } = supabase.storage
                .from('submissions')
                .getPublicUrl(filePath);
            fileUrl = urlData.publicUrl;
        }

        res.status(201).json({
            success: true,
            data: {
                submission: {
                    ...submission,
                    file_url: fileUrl,
                    student_name: submission.students.full_name
                }
            },
            message: 'Submission created successfully'
        });

    } catch (error) {
        console.error('Create submission error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// GET /api/submissions - Get all submissions with optional filters
router.get('/', async (req: Request, res: Response) => {
    try {
        const validation = getSubmissionsSchema.safeParse(req.query);
        
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid query parameters',
                details: validation.error.issues
            });
        }

        const { student_id, submission_type, lesson_id, project_type, limit = '50', offset = '0' } = validation.data;

        let query = supabase
            .from('submissions')
            .select(`
                *,
                students!inner(full_name)
            `)
            .order('created_at', { ascending: false });

        // Apply filters
        if (student_id) {
            query = query.eq('student_id', student_id);
        }
        if (submission_type) {
            query = query.eq('submission_type', submission_type);
        }
        if (lesson_id) {
            query = query.eq('lesson_id', lesson_id);
        }
        if (project_type) {
            query = query.eq('project_type', project_type);
        }

        // Apply pagination
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);
        query = query.range(offsetNum, offsetNum + limitNum - 1);

        const { data: submissions, error, count } = await query;

        if (error) {
            console.error('Get submissions error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch submissions',
                message: error.message
            });
        }

        // Get multiple files for submissions
        const submissionIds = submissions.map(s => s.id);
        const filesBySubmission = await getSubmissionFiles(submissionIds);

        // Add file URLs and multiple files to submissions
        const submissionsWithUrls = submissions.map(submission => {
            let fileUrl = null;
            if (submission.file_path) {
                const { data: urlData } = supabase.storage
                    .from('submissions')
                    .getPublicUrl(submission.file_path);
                fileUrl = urlData.publicUrl;
            }

            return {
                ...submission,
                file_url: fileUrl,
                files: filesBySubmission[submission.id] || [],
                student_name: submission.students.full_name
            };
        });

        res.json({
            success: true,
            data: {
                submissions: submissionsWithUrls,
                total: count || submissions.length,
                showing: {
                    limit: limitNum,
                    offset: offsetNum,
                    student_id_filter: student_id,
                    submission_type_filter: submission_type,
                    lesson_id_filter: lesson_id
                }
            }
        });

    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// GET /api/submissions/projects/public - Get public project submissions
router.get('/projects/public', async (req: Request, res: Response) => {
    try {
        const { project_type, limit = '50', offset = '0' } = req.query;

        let query = supabase
            .from('submissions')
            .select(`
                *,
                students!inner(full_name)
            `)
            .eq('submission_type', 'project')
            .eq('is_public', true)
            .order('created_at', { ascending: false });

        // Apply project type filter if specified
        if (project_type && (project_type === 'midterm' || project_type === 'final')) {
            query = query.eq('project_type', project_type);
        }

        // Apply pagination
        const limitNum = parseInt(limit as string);
        const offsetNum = parseInt(offset as string);
        query = query.range(offsetNum, offsetNum + limitNum - 1);

        const { data: projects, error, count } = await query;

        if (error) {
            console.error('Get public projects error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch public projects',
                message: error.message
            });
        }

        // Get multiple files for projects
        const projectIds = projects.map(p => p.id);
        const filesByProject = await getSubmissionFiles(projectIds);

        // Add file URLs and multiple files to projects
        const projectsWithUrls = projects.map(project => {
            let fileUrl = null;
            if (project.file_path) {
                const { data: urlData } = supabase.storage
                    .from('submissions')
                    .getPublicUrl(project.file_path);
                fileUrl = urlData.publicUrl;
            }

            return {
                ...project,
                file_url: fileUrl,
                files: filesByProject[project.id] || [],
                student_name: project.students.full_name
            };
        });

        res.json({
            success: true,
            data: {
                submissions: projectsWithUrls,
                total: count || projects.length,
                showing: {
                    limit: limitNum,
                    offset: offsetNum,
                    project_type_filter: project_type
                }
            }
        });

    } catch (error) {
        console.error('Get public projects error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// GET /api/submissions/:id - Get a specific submission
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const submissionId = req.params.id;

        const { data: submission, error } = await supabase
            .from('submissions')
            .select(`
                *,
                students!inner(full_name)
            `)
            .eq('id', submissionId)
            .single();

        if (error) {
            console.error('Get submission error:', error);
            return res.status(404).json({
                success: false,
                error: 'Submission not found',
                message: error.message
            });
        }

        // Get multiple files for this submission
        const filesBySubmission = await getSubmissionFiles([submission.id]);

        // Add file URL if present
        let fileUrl = null;
        if (submission.file_path) {
            const { data: urlData } = supabase.storage
                .from('submissions')
                .getPublicUrl(submission.file_path);
            fileUrl = urlData.publicUrl;
        }

        res.json({
            success: true,
            data: {
                submission: {
                    ...submission,
                    file_url: fileUrl,
                    files: filesBySubmission[submission.id] || [],
                    student_name: submission.students.full_name
                }
            }
        });

    } catch (error) {
        console.error('Get submission error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// PUT /api/submissions/:id/screenshots - Add screenshots to existing project
router.put('/:id/screenshots', upload.fields([
    { name: 'file_0', maxCount: 1 },
    { name: 'file_1', maxCount: 1 },
    { name: 'file_2', maxCount: 1 },
    { name: 'file_3', maxCount: 1 },
    { name: 'file_4', maxCount: 1 }
]), handleMulterError, async (req: Request, res: Response) => {
    try {
        const submissionId = req.params.id;
        const { student_id } = req.body;

        if (!student_id) {
            return res.status(400).json({
                success: false,
                error: 'Student ID is required'
            });
        }

        // Verify the submission exists and belongs to the student
        const { data: submission, error: fetchError } = await supabase
            .from('submissions')
            .select('id, student_id, submission_type, file_path')
            .eq('id', submissionId)
            .eq('student_id', student_id)
            .single();

        if (fetchError || !submission) {
            return res.status(404).json({
                success: false,
                error: 'Project submission not found or access denied'
            });
        }

        // Only allow adding screenshots to project submissions
        if (submission.submission_type !== 'project') {
            return res.status(400).json({
                success: false,
                error: 'Screenshots can only be added to project submissions'
            });
        }

        // Handle multiple file uploads
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        let uploadedFiles: Express.Multer.File[] = [];

        if (files) {
            // Collect all uploaded files from different field names
            uploadedFiles = [
                ...(files.file_0 || []),
                ...(files.file_1 || []),
                ...(files.file_2 || []),
                ...(files.file_3 || []),
                ...(files.file_4 || [])
            ];
        }

        if (uploadedFiles.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one screenshot file is required'
            });
        }

        try {
            // Get existing files count for ordering new files
            const { data: existingFiles } = await supabase
                .from('submission_files')
                .select('file_order')
                .eq('submission_id', submissionId)
                .order('file_order', { ascending: false })
                .limit(1);

            const nextFileOrder = existingFiles && existingFiles.length > 0 
                ? existingFiles[0].file_order + 1 
                : 0;

            // Upload all new files to storage
            let uploadedFileRecords: { path: string, name: string, size: number, mimeType: string }[] = [];
            
            for (let i = 0; i < uploadedFiles.length; i++) {
                const file = uploadedFiles[i];
                const storagePath = await uploadFileToStorage(file, student_id);
                uploadedFileRecords.push({
                    path: storagePath,
                    name: file.originalname,
                    size: file.size,
                    mimeType: file.mimetype
                });
            }

            // Save new file records with proper ordering
            const fileRecords = uploadedFileRecords.map((file, index) => ({
                submission_id: parseInt(submissionId),
                file_path: file.path,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.mimeType,
                file_order: nextFileOrder + index
            }));

            const { data: savedFiles, error: saveError } = await supabase
                .from('submission_files')
                .insert(fileRecords)
                .select();

            if (saveError) {
                console.error('Error saving submission files:', saveError);
                throw new Error('Failed to save file records');
            }

            // Get all files for this submission to update main record
            const { data: allFiles } = await supabase
                .from('submission_files')
                .select('*')
                .eq('submission_id', submissionId)
                .order('file_order');

            // Update submission with first file for backward compatibility
            const firstFile = allFiles && allFiles.length > 0 ? allFiles[0] : uploadedFileRecords[0];

            // Update submission with first file info or keep existing if no first file from allFiles
            let updateData: any = {
                updated_at: new Date().toISOString()
            };

            if (firstFile) {
                updateData = {
                    ...updateData,
                    file_path: firstFile.file_path || firstFile.path,
                    file_name: firstFile.file_name || firstFile.name,
                    file_size: firstFile.file_size || firstFile.size,
                    mime_type: firstFile.mime_type || firstFile.mimeType
                };
            }

            // Update submission with new file information
            const { data: updatedSubmission, error: updateError } = await supabase
                .from('submissions')
                .update(updateData)
                .eq('id', submissionId)
                .select(`
                    *,
                    students!inner(full_name)
                `)
                .single();

            if (updateError) {
                console.error('Submission update error:', updateError);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to update submission',
                    message: updateError.message
                });
            }

            // Get updated files with URLs
            const filesBySubmission = await getSubmissionFiles([updatedSubmission.id]);

            // Generate public URL for main file
            let fileUrl = null;
            if (firstFile && (firstFile.file_path || firstFile.path)) {
                const { data: urlData } = supabase.storage
                    .from('submissions')
                    .getPublicUrl(firstFile.file_path || firstFile.path);
                fileUrl = urlData.publicUrl;
            }

            res.json({
                success: true,
                data: {
                    submission: {
                        ...updatedSubmission,
                        file_url: fileUrl,
                        files: filesBySubmission[updatedSubmission.id] || [],
                        student_name: updatedSubmission.students.full_name
                    }
                },
                message: 'Screenshots added successfully'
            });

        } catch (uploadError) {
            console.error('File upload failed:', uploadError);
            return res.status(500).json({
                success: false,
                error: 'Failed to add screenshots',
                message: 'File upload to storage failed'
            });
        }

    } catch (error) {
        console.error('Add screenshots error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// DELETE /api/submissions/:id/files/:fileId - Delete a specific screenshot
router.delete('/:id/files/:fileId', async (req: Request, res: Response) => {
    try {
        const submissionId = req.params.id;
        const fileId = req.params.fileId;
        const { student_id } = req.query;

        if (!student_id) {
            return res.status(400).json({
                success: false,
                error: 'Student ID is required'
            });
        }

        // Verify the submission exists and belongs to the student
        const { data: submission, error: fetchError } = await supabase
            .from('submissions')
            .select('id, student_id, submission_type')
            .eq('id', submissionId)
            .eq('student_id', student_id)
            .single();

        if (fetchError || !submission) {
            return res.status(404).json({
                success: false,
                error: 'Project submission not found or access denied'
            });
        }

        // Get the file to delete
        const { data: fileToDelete, error: fileError } = await supabase
            .from('submission_files')
            .select('file_path')
            .eq('id', fileId)
            .eq('submission_id', submissionId)
            .single();

        if (fileError || !fileToDelete) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        // Delete the file from storage
        await supabase.storage
            .from('submissions')
            .remove([fileToDelete.file_path]);

        // Delete the file record
        await supabase
            .from('submission_files')
            .delete()
            .eq('id', fileId);

        // Get remaining files to update the main submission record
        const { data: remainingFiles } = await supabase
            .from('submission_files')
            .select('*')
            .eq('submission_id', submissionId)
            .order('file_order');

        // Update main submission record with first remaining file or null
        let updateData: any = {
            updated_at: new Date().toISOString()
        };

        if (remainingFiles && remainingFiles.length > 0) {
            const firstFile = remainingFiles[0];
            updateData = {
                ...updateData,
                file_path: firstFile.file_path,
                file_name: firstFile.file_name,
                file_size: firstFile.file_size,
                mime_type: firstFile.mime_type
            };
        } else {
            // No files remaining
            updateData = {
                ...updateData,
                file_path: null,
                file_name: null,
                file_size: null,
                mime_type: null
            };
        }

        await supabase
            .from('submissions')
            .update(updateData)
            .eq('id', submissionId);

        res.json({
            success: true,
            message: 'Screenshot deleted successfully',
            data: {
                remaining_files: remainingFiles?.length || 0
            }
        });

    } catch (error) {
        console.error('Delete screenshot error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// PUT /api/submissions/:id - Update project submission (owner only)
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const submissionId = req.params.id;
        const validation = updateProjectSchema.safeParse(req.body);
        
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request data',
                details: validation.error.issues
            });
        }

        const { student_id, title, description, github_url, is_public } = validation.data;

        // First verify the submission exists and belongs to the student
        const { data: existingSubmission, error: fetchError } = await supabase
            .from('submissions')
            .select('id, student_id, submission_type, project_type, title, description, github_url, is_public')
            .eq('id', submissionId)
            .single();

        if (fetchError) {
            return res.status(404).json({
                success: false,
                error: 'Submission not found',
                message: fetchError.message
            });
        }

        // Verify ownership
        if (existingSubmission.student_id !== student_id) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You can only edit your own submissions'
            });
        }

        // Only allow editing project submissions
        if (existingSubmission.submission_type !== 'project') {
            return res.status(400).json({
                success: false,
                error: 'Invalid submission type',
                message: 'Only project submissions can be edited'
            });
        }

        // Prepare update data - only update fields that were provided
        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        if (title !== undefined) {
            updateData.title = title;
        }
        if (description !== undefined) {
            updateData.description = description;
        }
        if (github_url !== undefined) {
            updateData.github_url = github_url;
        }
        if (is_public !== undefined) {
            updateData.is_public = is_public;
        }

        // Update the submission
        const { data: updatedSubmission, error: updateError } = await supabase
            .from('submissions')
            .update(updateData)
            .eq('id', submissionId)
            .select(`
                *,
                students!inner(full_name)
            `)
            .single();

        if (updateError) {
            console.error('Update submission error:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Failed to update submission',
                message: updateError.message
            });
        }

        // Get multiple files for this submission
        const filesBySubmission = await getSubmissionFiles([updatedSubmission.id]);

        // Generate public URL for file if present
        let fileUrl = null;
        if (updatedSubmission.file_path) {
            const { data: urlData } = supabase.storage
                .from('submissions')
                .getPublicUrl(updatedSubmission.file_path);
            fileUrl = urlData.publicUrl;
        }

        res.json({
            success: true,
            data: {
                submission: {
                    ...updatedSubmission,
                    file_url: fileUrl,
                    files: filesBySubmission[updatedSubmission.id] || [],
                    student_name: updatedSubmission.students.full_name
                }
            },
            message: 'Project updated successfully',
            changes: Object.keys(updateData).filter(key => key !== 'updated_at')
        });

    } catch (error) {
        console.error('Update submission error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// DELETE /api/submissions/:id - Delete a submission with related data cleanup
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const submissionId = req.params.id;
        const { student_id } = req.query;

        // Get the submission to verify ownership and check for files
        const { data: submission, error: fetchError } = await supabase
            .from('submissions')
            .select('id, student_id, submission_type, project_type, file_path, title')
            .eq('id', submissionId)
            .single();

        if (fetchError) {
            return res.status(404).json({
                success: false,
                error: 'Submission not found',
                message: fetchError.message
            });
        }

        // Verify ownership if student_id is provided (for non-admin deletions)
        if (student_id && submission.student_id !== student_id) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You can only delete your own submissions'
            });
        }

        // Get all associated files for cleanup
        const { data: submissionFiles } = await supabase
            .from('submission_files')
            .select('file_path')
            .eq('submission_id', submissionId);

        // Collect all file paths to delete from storage
        const filesToDelete: string[] = [];
        if (submission.file_path) {
            filesToDelete.push(submission.file_path);
        }
        if (submissionFiles) {
            filesToDelete.push(...submissionFiles.map(f => f.file_path));
        }

        // Clean up related data for project submissions
        if (submission.submission_type === 'project') {
            // Delete project votes (CASCADE will handle this, but we'll be explicit)
            const { error: votesError } = await supabase
                .from('project_votes')
                .delete()
                .eq('submission_id', submissionId);

            if (votesError) {
                console.error('Error deleting project votes:', votesError);
                // Continue with deletion even if votes cleanup fails
            }

            // Delete project notes (feedback from other students)  
            const { error: notesError } = await supabase
                .from('project_notes')
                .delete()
                .eq('submission_id', submissionId);

            if (notesError) {
                console.error('Error deleting project notes:', notesError);
                // Continue with deletion even if notes cleanup fails
            }
        }

        // Delete submission files records
        const { error: filesError } = await supabase
            .from('submission_files')
            .delete()
            .eq('submission_id', submissionId);

        if (filesError) {
            console.error('Error deleting submission files:', filesError);
            // Continue with deletion even if files cleanup fails
        }

        // Delete files from storage
        if (filesToDelete.length > 0) {
            const { error: storageError } = await supabase.storage
                .from('submissions')
                .remove(filesToDelete);

            if (storageError) {
                console.error('Storage deletion error:', storageError);
                // Continue with database deletion even if storage deletion fails
            }
        }

        // Finally, delete the submission record
        const { error: deleteError } = await supabase
            .from('submissions')
            .delete()
            .eq('id', submissionId);

        if (deleteError) {
            console.error('Delete submission error:', deleteError);
            return res.status(500).json({
                success: false,
                error: 'Failed to delete submission',
                message: deleteError.message
            });
        }

        const isProject = submission.submission_type === 'project';
        const projectTypeMsg = isProject ? ` (${submission.project_type} project)` : '';
        
        res.json({
            success: true,
            message: `${isProject ? 'Project' : 'Submission'} "${submission.title}"${projectTypeMsg} deleted successfully`,
            details: {
                deleted_submission_id: submissionId,
                was_project: isProject,
                project_type: isProject ? submission.project_type : null,
                files_deleted: filesToDelete.length,
                cleanup_performed: isProject ? ['votes', 'notes', 'files'] : ['files']
            }
        });

    } catch (error) {
        console.error('Delete submission error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;