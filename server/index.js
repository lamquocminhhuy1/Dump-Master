const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const { sequelize, User, Dump, History, Category, Group, GroupRole, GroupMember, GroupInvitation, GroupDump, Question } = require('./models');
const { Op, DataTypes } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

app.use(express.json());
// Ensure uploads directory exists and serve static files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Configure Multer for avatar uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if ((file.mimetype || '').startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

// Middleware
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

app.use(cors());

// --- Auth Routes ---

app.post('/api/auth/register', async (req, res) => {
    try {
        let { username, password } = req.body;
        username = String(username || '').trim();
        password = String(password || '');
        if (!username) return res.status(400).json({ error: 'Username is required' });
        if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        const existing = await User.findOne({ where: { username } });
        if (existing) return res.status(400).json({ error: 'Username already taken' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // First user is admin? Or just default user.
        // Let's check if any user exists, if not, make admin.
        const userCount = await User.count();
        const role = userCount === 0 ? 'admin' : 'user';

        const user = await User.create({ username, password: hashedPassword, role });
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);

        res.json({ 
            token, 
            user: { 
                id: user.id, 
                username: user.username, 
                role: user.role, 
                avatar: user.avatar, 
                bio: user.bio, 
                email: user.email, 
                displayName: user.displayName, 
                location: user.location 
            } 
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Username already taken' });
        }
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username } });

        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
        res.json({ 
            token, 
            user: { 
                id: user.id, 
                username: user.username, 
                role: user.role, 
                avatar: user.avatar, 
                bio: user.bio, 
                email: user.email, 
                displayName: user.displayName, 
                location: user.location 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        // Fetch full user data from database
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'username', 'role', 'avatar', 'bio', 'email', 'displayName', 'location']
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user: {
            id: user.id,
            username: user.username,
            role: user.role,
            avatar: user.avatar,
            bio: user.bio,
            email: user.email,
            displayName: user.displayName,
            location: user.location
        } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/me', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        // Support password change via this endpoint as well
        const { currentPassword, newPassword } = req.body;
        if (currentPassword !== undefined && newPassword !== undefined) {
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Current password and new password are required' });
            }
            if (String(newPassword).length < 6) {
                return res.status(400).json({ error: 'New password must be at least 6 characters long' });
            }
            const user = await User.findByPk(req.user.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            const validPassword = await bcrypt.compare(String(currentPassword), user.password);
            if (!validPassword) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            const hashedPassword = await bcrypt.hash(String(newPassword), 10);
            await User.update({ password: hashedPassword }, { where: { id: req.user.id } });
            return res.json({ message: 'Password updated successfully' });
        }

        // Profile updates
        const { bio, email, displayName, location } = req.body;
        const updateData = {};
        // Treat empty strings as null to avoid validation failures (e.g., email)
        if (bio !== undefined && bio !== '') updateData.bio = bio;
        if (email !== undefined) {
            if (email === '') {
                updateData.email = null;
            } else {
                updateData.email = email;
            }
        }
        if (displayName !== undefined && displayName !== '') updateData.displayName = displayName;
        if (location !== undefined && location !== '') updateData.location = location;
        if (req.file) {
            updateData.avatar = `/uploads/${req.file.filename}`;
        }

        await User.update(updateData, { where: { id: req.user.id } });
        const updatedUser = await User.findByPk(req.user.id);
        res.json({
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                role: updatedUser.role,
                avatar: updatedUser.avatar,
                bio: updatedUser.bio,
                email: updatedUser.email,
                displayName: updatedUser.displayName,
                location: updatedUser.location
            }
        });
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ error: error.errors?.[0]?.message || 'Validation error' });
        }
        console.error('Update profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Change password endpoint
app.put('/api/users/me/password', authenticateToken, async (req, res) => {
    res.status(403).json({ error: 'Password change is disabled' });
});

// --- Dump Routes ---

// Get shared dump by ID (public access, no auth required)
app.get('/api/dumps/shared/:id', async (req, res) => {
    try {
        const dump = await Dump.findByPk(req.params.id, {
            include: [{ model: User, attributes: ['username', 'avatar'] }]
        });

        if (!dump) {
            return res.status(404).json({ error: 'Dump not found' });
        }

        // Only allow access to public dumps
        if (!dump.isPublic) {
            return res.status(403).json({ error: 'This dump is private and cannot be shared' });
        }

        res.json(dump);
    } catch (error) {
        console.error('Error in GET /api/dumps/shared/:id:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/dumps', authenticateToken, async (req, res) => {
    try {
        const { type, search, category } = req.query;
        let whereClause = {};
        let dumps;
        if (type === 'public') {
            whereClause.isPublic = true;
            dumps = await Dump.findAll({
                where: whereClause,
                include: [{ model: User, attributes: ['username', 'avatar'] }],
                order: [['createdAt', 'DESC']]
            });
        } else if (type === 'group') {
            const memberships = await GroupMember.findAll({ where: { UserId: req.user.id } });
            const groupIds = memberships.map(m => m.GroupId);
            dumps = await Dump.findAll({
                include: [
                    { model: Group, through: { model: GroupDump }, where: { id: groupIds, isActive: true }, required: true },
                    { model: User, attributes: ['username', 'avatar'] }
                ],
                order: [['createdAt', 'DESC']]
            });
        } else {
            whereClause.UserId = req.user.id;
            dumps = await Dump.findAll({
                where: whereClause,
                include: [{ model: User, attributes: ['username', 'avatar'] }],
                order: [['createdAt', 'DESC']]
            });
        }

        if (search) {
            dumps = dumps.filter(d => (d.name || '').toLowerCase().includes(String(search).toLowerCase()));
        }

        // Only filter by category if it's specified and not 'All'
        if (category && category !== 'All' && category !== '' && category !== 'undefined') {
            dumps = dumps.filter(d => d.category === category);
        }
        res.json(dumps);
    } catch (error) {
        console.error('Error in GET /api/dumps:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single dump by ID with authorization
app.get('/api/dumps/:id', authenticateToken, async (req, res) => {
    try {
        const dump = await Dump.findByPk(req.params.id, {
            include: [
                { model: User, attributes: ['username', 'avatar'] },
                { model: Group, through: { model: GroupDump } }
            ]
        });
        if (!dump) return res.status(404).json({ error: 'Dump not found' });

        // Authorization: owner, admin, or member of any group linked to dump
    if (dump.UserId !== req.user.id && req.user.role !== 'admin') {
            if (!dump.isPublic) {
                const memberships = await GroupMember.findAll({ where: { UserId: req.user.id } });
                const userGroupIds = new Set(memberships.map(m => m.GroupId));
                const dumpGroupIds = new Set((dump.Groups || []).map(g => g.id));
                const allowed = [...dumpGroupIds].some(id => userGroupIds.has(id));
                if (!allowed) return res.status(403).json({ error: 'Not authorized' });
            }
        }

        res.json(dump);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Group Routes

app.post('/api/dumps', authenticateToken, async (req, res) => {
    try {
        const { name, questions, isPublic, timeLimit, showAnswerImmediately, category, coverImage } = req.body;
        const dump = await Dump.create({
            name,
            questions,
            isPublic: isPublic || false,
            timeLimit: timeLimit || 0,
            showAnswerImmediately: showAnswerImmediately !== undefined ? showAnswerImmediately : true,
            category: category || 'Uncategorized',
            coverImage: coverImage || null,
            UserId: req.user.id
        });
        if (Array.isArray(questions)) {
            const rows = questions.map(q => ({
                text: q.question || '',
                optionA: q.options?.A || '',
                optionB: q.options?.B || '',
                optionC: q.options?.C || '',
                optionD: q.options?.D || '',
                correctAnswer: Array.isArray(q.correctAnswers) ? q.correctAnswers.join(',') : (q.correctAnswer || 'A'),
                DumpId: dump.id
            }));
            await Question.bulkCreate(rows);
        }
        res.json(dump);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/dumps/:id', authenticateToken, async (req, res) => {
    try {
        const dump = await Dump.findByPk(req.params.id);
        if (!dump) return res.status(404).json({ error: 'Dump not found' });

        if (dump.UserId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { name, questions, isPublic, timeLimit, showAnswerImmediately, category, coverImage } = req.body;
        await dump.update({
            name,
            questions,
            isPublic,
            timeLimit,
            showAnswerImmediately,
            category,
            coverImage: coverImage !== undefined ? (coverImage || null) : dump.coverImage
        });
        if (Array.isArray(questions)) {
            await Question.destroy({ where: { DumpId: dump.id } });
            const rows = questions.map(q => ({
                text: q.question || '',
                optionA: q.options?.A || '',
                optionB: q.options?.B || '',
                optionC: q.options?.C || '',
                optionD: q.options?.D || '',
                correctAnswer: Array.isArray(q.correctAnswers) ? q.correctAnswers.join(',') : (q.correctAnswer || 'A'),
                DumpId: dump.id
            }));
            await Question.bulkCreate(rows);
        }
        res.json(dump);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/dumps/:id', authenticateToken, async (req, res) => {
    try {
        const dump = await Dump.findByPk(req.params.id);
        if (!dump) return res.status(404).json({ error: 'Dump not found' });

        // Allow if owner OR admin
        if (dump.UserId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await dump.destroy();
        res.json({ message: 'Dump deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export dump questions to Excel
app.get('/api/dumps/:id/export', authenticateToken, async (req, res) => {
    try {
        const dump = await Dump.findByPk(req.params.id);
        if (!dump) return res.status(404).json({ error: 'Dump not found' });

        // Check access
        if (!dump.isPublic && dump.UserId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const XLSX = require('xlsx');
        
        // Flatten questions for export (options object -> optionA, optionB, etc.)
        // Exclude the id field as it's not needed in the exported file
        let flattenedQuestions = [];
        const qRows = await Question.findAll({ where: { DumpId: dump.id } });
        if (qRows.length > 0) {
            flattenedQuestions = qRows.map(r => ({
                question: r.text || '',
                optionA: r.optionA || '',
                optionB: r.optionB || '',
                optionC: r.optionC || '',
                optionD: r.optionD || '',
                correctAnswer: r.correctAnswer || ''
            }));
        } else {
            flattenedQuestions = (dump.questions || []).map(q => ({
                question: q.question || '',
                optionA: q.options?.A || '',
                optionB: q.options?.B || '',
                optionC: q.options?.C || '',
                optionD: q.options?.D || '',
                correctAnswer: q.correctAnswer || ''
            }));
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(flattenedQuestions);
        XLSX.utils.book_append_sheet(wb, ws, 'Questions');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename="${dump.name}_questions.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Import Excel into existing dump
app.post('/api/dumps/:id/import', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const dump = await Dump.findByPk(req.params.id);
        if (!dump) return res.status(404).json({ error: 'Dump not found' });

        // Check ownership
        if (dump.UserId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const XLSX = require('xlsx');
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const importedData = XLSX.utils.sheet_to_json(worksheet);

        if (importedData.length === 0) {
            return res.status(400).json({ error: 'The Excel file appears to be empty or has no data rows.' });
        }

        // Helper function to get value with case-insensitive matching
        const getValue = (row, possibleKeys) => {
            for (const key of possibleKeys) {
                if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                    return row[key];
                }
                const lowerKey = key.toLowerCase();
                for (const rowKey in row) {
                    if (rowKey.toLowerCase() === lowerKey) {
                        return row[rowKey];
                    }
                }
            }
            return null;
        };

        // Transform imported data to match internal format - support multiple formats
        const importedQuestions = importedData.map((row, index) => {
            let question = getValue(row, ['question', 'Question']);
            let optionA = getValue(row, ['optionA', 'OptionA', 'A', 'a']);
            let optionB = getValue(row, ['optionB', 'OptionB', 'B', 'b']);
            let optionC = getValue(row, ['optionC', 'OptionC', 'C', 'c']);
            let optionD = getValue(row, ['optionD', 'OptionD', 'D', 'd']);
            let correctAnswer = getValue(row, ['correctAnswer', 'CorrectAnswer', 'correctanswer', 'Answer', 'answer']);

            // If options is a nested object (from exports), extract it
            if (row.options && typeof row.options === 'object' && !Array.isArray(row.options)) {
                optionA = row.options.A || optionA;
                optionB = row.options.B || optionB;
                optionC = row.options.C || optionC;
                optionD = row.options.D || optionD;
            }

            // Validate required fields
            if (!question) {
                console.warn(`Skipping row ${index + 2}: Missing question text`);
                return null;
            }

            if (!correctAnswer) {
                console.warn(`Skipping row ${index + 2}: Missing correct answer`);
                return null;
            }

            // Normalize correctAnswer to uppercase letter
            const normalizedAnswer = correctAnswer.toString().trim().toUpperCase();
            if (!['A', 'B', 'C', 'D'].includes(normalizedAnswer)) {
                console.warn(`Skipping row ${index + 2}: Invalid correct answer "${correctAnswer}". Must be A, B, C, or D.`);
                return null;
            }

            return {
                question: question.toString().trim(),
                optionA: (optionA || '').toString().trim(),
                optionB: (optionB || '').toString().trim(),
                optionC: (optionC || '').toString().trim(),
                optionD: (optionD || '').toString().trim(),
                correctAnswer: normalizedAnswer
            };
        }).filter(q => q !== null);

        // Validate imported questions
        if (importedQuestions.length === 0) {
            return res.status(400).json({ error: 'No valid questions found in file. Expected columns: question, optionA, optionB, optionC, optionD, correctAnswer' });
        }

        const existingQuestions = dump.questions || [];
        const action = req.body.action || 'detect'; // detect, skip, replace, merge

        // Convert imported questions to internal format (with options object)
        const convertedQuestions = importedQuestions.map(q => ({
            id: q.id || Math.floor(Math.random() * 1000000),
            question: q.question,
            options: {
                A: q.optionA,
                B: q.optionB,
                C: q.optionC,
                D: q.optionD
            },
            correctAnswer: q.correctAnswer
        }));

        // Detect duplicates
        const duplicates = [];
        const newQuestions = [];

        convertedQuestions.forEach(incoming => {
            const existingIndex = existingQuestions.findIndex(existing =>
                existing.question.trim().toLowerCase() === incoming.question.trim().toLowerCase()
            );

            if (existingIndex !== -1) {
                const existing = existingQuestions[existingIndex];
                const hasChanges =
                    (existing.options?.A || '') !== (incoming.options?.A || '') ||
                    (existing.options?.B || '') !== (incoming.options?.B || '') ||
                    (existing.options?.C || '') !== (incoming.options?.C || '') ||
                    (existing.options?.D || '') !== (incoming.options?.D || '') ||
                    existing.correctAnswer !== incoming.correctAnswer;

                duplicates.push({
                    question: incoming.question,
                    existing: existing,
                    incoming: incoming,
                    hasChanges: hasChanges,
                    index: existingIndex
                });
            } else {
                newQuestions.push(incoming);
            }
        });

        // If duplicates found and no action specified, return for user decision
        if (duplicates.length > 0 && action === 'detect') {
            return res.json({
                status: 'duplicates_found',
                duplicates: duplicates,
                newQuestions: newQuestions.length,
                message: `Found ${duplicates.length} duplicate(s) and ${newQuestions.length} new question(s)`
            });
        }

        // Apply action
        let finalQuestions = [...existingQuestions];

        if (action === 'skip') {
            // Only add new questions
            finalQuestions = [...existingQuestions, ...newQuestions];
        } else if (action === 'replace') {
            // Replace duplicates with new versions
            duplicates.forEach(dup => {
                finalQuestions[dup.index] = dup.incoming;
            });
            finalQuestions = [...finalQuestions, ...newQuestions];
        } else if (action === 'merge') {
            // Keep both versions (add suffix to incoming)
            const mergedDuplicates = duplicates.map(dup => ({
                ...dup.incoming,
                question: `${dup.incoming.question} (imported)`
            }));
            finalQuestions = [...existingQuestions, ...mergedDuplicates, ...newQuestions];
        }

        // Update dump
        dump.questions = finalQuestions;
        await dump.save();
        await Question.destroy({ where: { DumpId: dump.id } });
        const rows = finalQuestions.map(q => ({
            text: q.question || '',
            optionA: q.options?.A || '',
            optionB: q.options?.B || '',
            optionC: q.options?.C || '',
            optionD: q.options?.D || '',
            correctAnswer: q.correctAnswer || 'A',
            DumpId: dump.id
        }));
        await Question.bulkCreate(rows);

        // Clean up uploaded file
        const fs = require('fs');
        fs.unlinkSync(req.file.path);

        res.json({
            status: 'success',
            message: `Import completed. Added ${newQuestions.length} new question(s), ${duplicates.length} duplicate(s) handled.`,
            totalQuestions: finalQuestions.length
        });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message });
    }
});


// --- History Routes ---

app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        const { search } = req.query;
        let whereClause = { UserId: req.user.id };

        if (search) {
            whereClause.dumpName = { [Op.like]: `%${search}%` };
        }

        const rows = await History.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });
        const history = rows.map(h => ({
            id: h.id,
            userId: h.UserId,
            dumpId: h.DumpId,
            dumpName: h.dumpName,
            score: h.score,
            total: h.total,
            answers: h.answers,
            createdAt: h.createdAt
        }));
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/history', authenticateToken, async (req, res) => {
    try {
        const { dumpId, dumpName, score, total, answers } = req.body;
        const h = await History.create({
            UserId: req.user.id,
            DumpId: dumpId,
            dumpName,
            score,
            total,
            answers
        });
        res.json({
            id: h.id,
            userId: h.UserId,
            dumpId: h.DumpId,
            dumpName: h.dumpName,
            score: h.score,
            total: h.total,
            answers: h.answers,
            createdAt: h.createdAt
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Admin Routes ---

// User Management
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'role', 'avatar', 'createdAt'],
            include: [
                {
                    model: Dump,
                    attributes: ['id']
                },
                {
                    model: History,
                    attributes: ['score', 'total']
                }
            ]
        });

        // Calculate stats for each user
        const usersWithStats = users.map(user => {
            const dumpCount = user.Dumps ? user.Dumps.length : 0;
            const quizCount = user.Histories ? user.Histories.length : 0;
            const avgScore = user.Histories && user.Histories.length > 0
                ? user.Histories.reduce((sum, h) => sum + (h.score / h.total * 100), 0) / user.Histories.length
                : 0;

            return {
                id: user.id,
                username: user.username,
                role: user.role,
                avatar: user.avatar,
                createdAt: user.createdAt,
                dumpCount,
                quizCount,
                avgScore: Math.round(avgScore)
            };
        });

        res.json(usersWithStats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await user.update({ role });
        res.json({ message: 'Role updated', user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });

        await user.destroy();
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Category Management
app.get('/api/admin/categories', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const categories = await Category.findAll({
            order: [['name', 'ASC']]
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/categories', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { code, name, description, isPublic, groupId } = req.body;
        if (!code || !name) {
            return res.status(400).json({ error: 'Code and name are required' });
        }
        const category = await Category.create({ code, name, description, isPublic: isPublic !== undefined ? !!isPublic : true, GroupId: groupId || null });
        res.json(category);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Category code already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { code, name, description, isPublic, groupId } = req.body;
        const category = await Category.findByPk(req.params.id);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        await category.update({ code, name, description, isPublic: isPublic !== undefined ? !!isPublic : category.isPublic, GroupId: groupId !== undefined ? groupId || null : category.GroupId });
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) return res.status(404).json({ error: 'Category not found' });

        await category.destroy();
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dump Management (Admin view all)
app.get('/api/admin/dumps', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { search, category, owner } = req.query;
        let whereClause = {};

        if (search) {
            whereClause.name = { [Op.like]: `%${search}%` };
        }
        if (category && category !== 'All') {
            whereClause.category = category;
        }
        if (owner) {
            whereClause.UserId = owner;
        }

        const dumps = await Dump.findAll({
            where: whereClause,
            include: [{ model: User, attributes: ['id', 'username'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(dumps);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin - Questions list
app.get('/api/admin/questions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { search = '', groupId = '', exact = '' } = req.query;
        const recordRows = await Question.findAll({
            include: [
                {
                    model: Dump,
                    include: [
                        { model: User, attributes: ['username'] },
                        { model: Group, through: { model: GroupDump }, ...(groupId ? { where: { id: groupId, isActive: true }, required: true } : {}) }
                    ]
                }
            ],
            order: [[sequelize.col('Dump.createdAt'), 'DESC']]
        });

        let filteredRecords = recordRows;
        if (search) {
            const q = String(search).toLowerCase();
            const isExact = String(exact) === '1' || String(exact).toLowerCase() === 'true';
            filteredRecords = filteredRecords.filter(r => {
                const text = (r.text || '').toLowerCase();
                const dumpName = (r.Dump?.name || '').toLowerCase();
                return isExact ? (text === q || dumpName === q) : (text.includes(q) || dumpName.includes(q));
            });
        }

        if (filteredRecords.length > 0) {
            return res.json(filteredRecords);
        }

        const dumps = await Dump.findAll({
            include: [
                { model: User, attributes: ['username'] },
                { model: Group, through: { model: GroupDump }, ...(groupId ? { where: { id: groupId, isActive: true }, required: true } : {}) }
            ],
            order: [['createdAt', 'DESC']]
        });

        let fallback = [];
        for (const dump of dumps) {
            const dq = Array.isArray(dump.questions) ? dump.questions : [];
            const dumpJson = {
                name: dump.name,
                User: { username: dump.User?.username || '' },
                Groups: (dump.Groups || []).map(g => ({ name: g.name }))
            };
            dq.forEach((q, idx) => {
                fallback.push({
                    id: `${dump.id}:${idx}`,
                    text: q.question || '',
                    Dump: dumpJson
                });
            });
        }

        if (search) {
            const q = String(search).toLowerCase();
            const isExact = String(exact) === '1' || String(exact).toLowerCase() === 'true';
            fallback = fallback.filter(r => {
                const text = (r.text || '').toLowerCase();
                const dumpName = (r.Dump?.name || '').toLowerCase();
                return isExact ? (text === q || dumpName === q) : (text.includes(q) || dumpName.includes(q));
            });
        }
        res.json(fallback);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin - Delete a question record and sync dump JSON
app.delete('/api/admin/questions/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const q = await Question.findByPk(req.params.id, { include: [{ model: Dump }] });
        if (!q) return res.status(404).json({ error: 'Question not found' });
        const dump = q.Dump;
        if (!dump) return res.status(404).json({ error: 'Parent dump not found' });

        const existing = Array.isArray(dump.questions) ? dump.questions : [];
        const idx = existing.findIndex(x => String(x.question || '').trim() === String(q.text || '').trim());
        if (idx !== -1) {
            existing.splice(idx, 1);
            dump.questions = existing;
            await dump.save();
        }
        await q.destroy();
        return res.json({ message: 'Question deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin - Export questions with filters
app.get('/api/admin/questions/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { search = '', groupId = '', exact = '' } = req.query;
        const rows = await Question.findAll({
            include: [{
                model: Dump,
                include: [
                    { model: User, attributes: ['username'] },
                    { model: Group, through: { model: GroupDump }, ...(groupId ? { where: { id: groupId, isActive: true }, required: true } : {}) }
                ]
            }],
            order: [[sequelize.col('Dump.createdAt'), 'DESC']]
        });

        let dataRows = rows;
        if (search) {
            const q = String(search).toLowerCase();
            const isExact = String(exact) === '1' || String(exact).toLowerCase() === 'true';
            dataRows = dataRows.filter(r => {
                const text = (r.text || '').toLowerCase();
                const dumpName = (r.Dump?.name || '').toLowerCase();
                return isExact ? (text === q || dumpName === q) : (text.includes(q) || dumpName.includes(q));
            });
        }

        if (dataRows.length === 0) {
            const dumps = await Dump.findAll({
                include: [
                    { model: User, attributes: ['username'] },
                    { model: Group, through: { model: GroupDump }, ...(groupId ? { where: { id: groupId, isActive: true }, required: true } : {}) }
                ],
                order: [['createdAt', 'DESC']]
            });
            let fb = [];
            for (const dump of dumps) {
                const dq = Array.isArray(dump.questions) ? dump.questions : [];
                dq.forEach(q => fb.push({ text: q.question || '', Dump: dump }));
            }
            if (search) {
                const q = String(search).toLowerCase();
                const isExact = String(exact) === '1' || String(exact).toLowerCase() === 'true';
                fb = fb.filter(r => {
                    const text = (r.text || '').toLowerCase();
                    const dumpName = (r.Dump?.name || '').toLowerCase();
                    return isExact ? (text === q || dumpName === q) : (text.includes(q) || dumpName.includes(q));
                });
            }
            dataRows = fb;
        }

        const XLSX = require('xlsx');
        const data = dataRows.map(r => ({
            question: r.text || '',
            dump: r.Dump?.name || '',
            owner: r.Dump?.User?.username || '',
            groups: (r.Dump?.Groups || []).map(g => g.name).join(', ')
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Questions');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename="admin_questions.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Group Categories endpoints
app.get('/api/groups/:id/categories', authenticateToken, async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (!group.isActive) return res.status(403).json({ error: 'Group is inactive' });
        // Owner or admin or member can view
        const membership = await GroupMember.findOne({ where: { GroupId: group.id, UserId: req.user.id } });
        if (!membership && group.UserId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const categories = await Category.findAll({ where: { GroupId: group.id } });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/groups/:id/categories', authenticateToken, async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        // Only owner or admin can create categories for group
        if (group.UserId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
        let { code, name, description } = req.body;
        code = String(code || '').trim();
        name = String(name || '').trim();
        description = String(description || '').trim();
        if (!code || !name) return res.status(400).json({ error: 'Code and name are required' });
        const existingCode = await Category.findOne({ where: { code } });
        if (existingCode) return res.status(400).json({ error: 'Category code already exists' });
        const cat = await Category.create({ code, name, description, GroupId: group.id, isPublic: false });
        res.json(cat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/groups', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const groups = await Group.findAll({ include: [{ model: User, attributes: ['username'] }] });
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin - Toggle group active status
app.put('/api/admin/groups/:id/active', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { isActive } = req.body;
        const group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        group.isActive = !!isActive;
        await group.save();
        res.json({ message: 'Group status updated', group });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/groups/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        await GroupMember.destroy({ where: { GroupId: group.id } });
        await GroupRole.destroy({ where: { GroupId: group.id } });
        await GroupDump.destroy({ where: { GroupId: group.id } });
        await GroupInvitation.destroy({ where: { GroupId: group.id } });
        await group.destroy();
        res.json({ message: 'Group deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin Statistics
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalDumps = await Dump.count();
        const totalQuizzes = await History.count();

        // Average score across all quizzes
        const allHistory = await History.findAll({ attributes: ['score', 'total'] });
        const avgScore = allHistory.length > 0
            ? allHistory.reduce((sum, h) => sum + (h.score / h.total * 100), 0) / allHistory.length
            : 0;

        // Quizzes per day (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentQuizzes = await History.findAll({
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            },
            attributes: ['createdAt']
        });

        // Group by date
        const quizzesByDate = {};
        recentQuizzes.forEach(quiz => {
            const date = quiz.createdAt.toISOString().split('T')[0];
            quizzesByDate[date] = (quizzesByDate[date] || 0) + 1;
        });

        // Dumps by category
        const dumpsByCategory = await Dump.findAll({
            attributes: ['category', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['category']
        });

        // Most popular dumps
        const popularDumps = await History.findAll({
            attributes: [
                'DumpId',
                'dumpName',
                [sequelize.fn('COUNT', sequelize.col('History.id')), 'attemptCount']
            ],
            group: ['DumpId', 'dumpName'],
            order: [[sequelize.fn('COUNT', sequelize.col('History.id')), 'DESC']],
            limit: 10
        });

        res.json({
            overview: {
                totalUsers,
                totalDumps,
                totalQuizzes,
                avgScore: Math.round(avgScore)
            },
            quizzesByDate,
            dumpsByCategory,
            popularDumps
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin - History list by date
app.get('/api/admin/history', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { date } = req.query;
        const where = {};
        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            where.createdAt = { [Op.between]: [start, end] };
        }
        const rows = await History.findAll({
            where,
            include: [
                { model: User, attributes: ['username'] },
                { model: Dump, attributes: ['name'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Groups


// Serve Static Files (Frontend)

// Initialize DB and Start Server
sequelize.sync().then(async () => {
    console.log('Database synced');

    // Ensure new columns exist on existing SQLite databases without using alter:true
    try {
        const qi = sequelize.getQueryInterface();
        // Add isPublic to Categories if missing
        try {
            await qi.addColumn('Categories', 'isPublic', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true });
            console.log('Added Categories.isPublic column');
        } catch {
            console.log('Categories.isPublic already exists');
        }
        // Add GroupId to Categories if missing
        try {
            await qi.addColumn('Categories', 'GroupId', { type: DataTypes.UUID, allowNull: true });
            console.log('Added Categories.GroupId column');
        } catch {
            console.log('Categories.GroupId already exists');
        }
        // Add isActive to Groups if missing
        try {
            await qi.addColumn('Groups', 'isActive', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true });
            console.log('Added Groups.isActive column');
        } catch {
            console.log('Groups.isActive already exists');
        }
        // Add coverImage to Dumps if missing
        try {
            await qi.addColumn('Dumps', 'coverImage', { type: DataTypes.STRING, allowNull: true });
            console.log('Added Dumps.coverImage column');
        } catch {
            console.log('Dumps.coverImage already exists');
        }
    } catch (e) {
        console.warn('Schema ensure step failed:', e.message);
    }

    // Seed initial categories if none exist
    const categoryCount = await Category.count();
    if (categoryCount === 0) {
        console.log('Seeding initial categories...');
        await Category.bulkCreate([
            { code: 'CSA', name: 'CSA - Certified System Administrator', description: 'ServiceNow System Administrator certification' },
            { code: 'CIS', name: 'CIS - Certified Implementation Specialist', description: 'ServiceNow Implementation Specialist certification' },
            { code: 'CAD', name: 'CAD - Certified Application Developer', description: 'ServiceNow Application Developer certification' },
            { code: 'CTA', name: 'CTA - Certified Technical Architect', description: 'ServiceNow Technical Architect certification' },
            { code: 'CSM', name: 'CSM - Customer Service Management', description: 'Customer Service Management certification' },
            { code: 'ITSM', name: 'ITSM - IT Service Management', description: 'IT Service Management certification' },
            { code: 'ITOM', name: 'ITOM - IT Operations Management', description: 'IT Operations Management certification' },
            { code: 'SecOps', name: 'SecOps - Security Operations', description: 'Security Operations certification' },
            { code: 'HRSD', name: 'HRSD - HR Service Delivery', description: 'HR Service Delivery certification' },
            { code: 'Other', name: 'Other', description: 'Other certifications or topics' }
        ]);
        console.log('Categories seeded successfully');
    }

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
// Group Routes
app.post('/api/groups', authenticateToken, async (req, res) => {
    try {
        let { name, description } = req.body;
        name = String(name || '').trim();
        description = String(description || '').trim();
        if (!name) return res.status(400).json({ error: 'Group name is required' });
        if (name.length > 100) return res.status(400).json({ error: 'Group name too long' });
        const existing = await Group.findOne({ where: { UserId: req.user.id, name } });
        if (existing) return res.status(400).json({ error: 'You already have a group with this name' });
        const group = await Group.create({ name, description, UserId: req.user.id });
        const adminRole = await GroupRole.create({ GroupId: group.id, name: 'admin', canCreate: true, canRead: true, canUpdate: true, canDelete: true });
        await GroupMember.create({ GroupId: group.id, UserId: req.user.id, GroupRoleId: adminRole.id });
        res.json(group);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Group name must be unique per owner' });
        }
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/groups/:id', authenticateToken, async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.UserId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
        let { name, description } = req.body;
        name = String(name || '').trim();
        description = String(description || '').trim();
        if (!name) return res.status(400).json({ error: 'Group name is required' });
        if (name.length > 100) return res.status(400).json({ error: 'Group name too long' });
        const duplicate = await Group.findOne({ where: { UserId: group.UserId, name } });
        if (duplicate && duplicate.id !== group.id) return res.status(400).json({ error: 'You already have a group with this name' });
        await group.update({ name, description });
        res.json(group);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/groups', authenticateToken, async (req, res) => {
    try {
        const owned = await Group.findAll({ where: { UserId: req.user.id } });
        const memberships = await GroupMember.findAll({ where: { UserId: req.user.id } });
        const groupIds = memberships.map(m => m.GroupId);
        const memberGroups = await Group.findAll({ where: { id: groupIds } });
        res.json({ owned, member: memberGroups });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/groups/summary', authenticateToken, async (req, res) => {
    try {
        const owned = await Group.findAll({ include: [{ model: User, attributes: ['username'] }], where: { UserId: req.user.id } });
        const memberships = await GroupMember.findAll({ where: { UserId: req.user.id } });
        const groupIds = memberships.map(m => m.GroupId);
        const memberGroups = await Group.findAll({ include: [{ model: User, attributes: ['username'] }], where: { id: groupIds } });
        const ownedIds = owned.map(g => g.id);
        const all = [...owned, ...memberGroups.filter(g => !ownedIds.includes(g.id))];
        const results = [];
        for (const g of all) {
            const count = await GroupMember.count({ where: { GroupId: g.id } });
            results.push({
                id: g.id,
                name: g.name,
                description: g.description,
                owner: g.User?.username || '',
                memberCount: count,
                updatedAt: g.updatedAt,
                type: g.UserId === req.user.id ? 'owned' : 'member',
                isActive: !!g.isActive
            });
        }
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/groups/:id/invitations', authenticateToken, async (req, res) => {
    try {
        const { inviteeUsername } = req.body;
        const group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (!group.isActive) return res.status(403).json({ error: 'Group is inactive' });
        if (group.UserId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
        const token = require('crypto').randomBytes(16).toString('hex');
        const invitee = await User.findOne({ where: { username: inviteeUsername } });
        if (invitee) {
            const memberRole = await GroupRole.findOne({ where: { GroupId: group.id, name: 'member' } }) || await GroupRole.create({ GroupId: group.id, name: 'member', canRead: true });
            await GroupMember.findOrCreate({ where: { GroupId: group.id, UserId: invitee.id }, defaults: { GroupRoleId: memberRole.id } });
            return res.json({ message: 'User added to group' });
        }
        const invitation = await GroupInvitation.create({ GroupId: group.id, token, inviteeUsername, inviterId: req.user.id });
        res.json({ token, invitation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/invitations/:token/accept', authenticateToken, async (req, res) => {
    try {
        const invitation = await GroupInvitation.findOne({ where: { token: req.params.token } });
        if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
        const group = await Group.findByPk(invitation.GroupId);
        if (group && !group.isActive) return res.status(403).json({ error: 'Group is inactive' });
        const memberRole = await GroupRole.findOne({ where: { GroupId: invitation.GroupId, name: 'member' } }) || await GroupRole.create({ GroupId: invitation.GroupId, name: 'member', canRead: true });
        await GroupMember.findOrCreate({ where: { GroupId: invitation.GroupId, UserId: req.user.id }, defaults: { GroupRoleId: memberRole.id } });
        invitation.status = 'accepted';
        await invitation.save();
        res.json({ message: 'Joined group' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/dumps/:id/share/groups', authenticateToken, async (req, res) => {
    try {
        const { groupIds } = req.body;
        const dump = await Dump.findByPk(req.params.id);
        if (!dump) return res.status(404).json({ error: 'Dump not found' });
        if (dump.UserId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
        const validGroups = await Group.findAll({ where: { id: groupIds, isActive: true } });
        for (const g of validGroups) {
            await GroupDump.findOrCreate({ where: { GroupId: g.id, DumpId: dump.id } });
        }
        res.json({ message: 'Shared to groups' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get groups a dump is shared to (owner/admin only)
app.get('/api/dumps/:id/groups', authenticateToken, async (req, res) => {
    try {
        const dump = await Dump.findByPk(req.params.id);
        if (!dump) return res.status(404).json({ error: 'Dump not found' });
        if (dump.UserId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const groups = await Group.findAll({
            include: [{ model: Dump, through: { model: GroupDump }, where: { id: dump.id }, required: true }],
            where: { isActive: true }
        });
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Replace dump's shared groups with provided list (owner/admin only)
app.put('/api/dumps/:id/share/groups', authenticateToken, async (req, res) => {
    try {
        const { groupIds = [] } = req.body;
        const dump = await Dump.findByPk(req.params.id);
        if (!dump) return res.status(404).json({ error: 'Dump not found' });
        if (dump.UserId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });

        const existing = await GroupDump.findAll({ where: { DumpId: dump.id } });
        const existingIds = new Set(existing.map(r => r.GroupId));
        const desiredIds = new Set(groupIds);

        // Delete associations not desired
        const toDelete = existing.filter(r => !desiredIds.has(r.GroupId));
        for (const r of toDelete) {
            await r.destroy();
        }

        // Ensure desired associations exist
        if (groupIds.length > 0) {
            const validGroups = await Group.findAll({ where: { id: groupIds, isActive: true } });
            for (const g of validGroups) {
                if (!existingIds.has(g.id)) {
                    await GroupDump.findOrCreate({ where: { GroupId: g.id, DumpId: dump.id } });
                }
            }
        }

        res.json({ message: 'Share settings updated', groupIds });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Group Roles Management
app.get('/api/groups/:id/roles', authenticateToken, async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        // Owner or admin can view/manage roles; members can view
        const membership = await GroupMember.findOne({ where: { GroupId: group.id, UserId: req.user.id } });
        if (!membership && group.UserId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const roles = await GroupRole.findAll({ where: { GroupId: group.id } });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/groups/:id/roles', authenticateToken, async (req, res) => {
    try {
        const { name, canCreate = false, canRead = true, canUpdate = false, canDelete = false } = req.body;
        const group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.UserId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
        const role = await GroupRole.create({ GroupId: group.id, name, canCreate, canRead, canUpdate, canDelete });
        res.json(role);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/groups/:groupId/roles/:roleId', authenticateToken, async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.UserId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
        const role = await GroupRole.findOne({ where: { id: req.params.roleId, GroupId: group.id } });
        if (!role) return res.status(404).json({ error: 'Role not found' });
        const { name, canCreate, canRead, canUpdate, canDelete } = req.body;
        await role.update({ name, canCreate, canRead, canUpdate, canDelete });
        res.json(role);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/groups/:groupId/roles/:roleId', authenticateToken, async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.UserId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
        const role = await GroupRole.findOne({ where: { id: req.params.roleId, GroupId: group.id } });
        if (!role) return res.status(404).json({ error: 'Role not found' });
        await role.destroy();
        res.json({ message: 'Role deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Group Members Management
app.get('/api/groups/:id/members', authenticateToken, async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        const membership = await GroupMember.findOne({ where: { GroupId: group.id, UserId: req.user.id } });
        if (!membership && group.UserId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const members = await GroupMember.findAll({
            where: { GroupId: group.id },
            include: [
                { model: User, attributes: ['id', 'username', 'avatar'] },
                { model: GroupRole }
            ]
        });
        res.json(members);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/groups/:groupId/members/:userId/role', authenticateToken, async (req, res) => {
    try {
        const { roleId } = req.body;
        const group = await Group.findByPk(req.params.groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.UserId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
        const membership = await GroupMember.findOne({ where: { GroupId: group.id, UserId: req.params.userId } });
        if (!membership) return res.status(404).json({ error: 'Member not found' });
        const role = await GroupRole.findOne({ where: { id: roleId, GroupId: group.id } });
        if (!role) return res.status(404).json({ error: 'Role not found' });
        membership.GroupRoleId = role.id;
        await membership.save();
        res.json({ message: 'Member role updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove member from group (owner or admin)
app.delete('/api/groups/:groupId/members/:userId', authenticateToken, async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.UserId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
        const membership = await GroupMember.findOne({ where: { GroupId: group.id, UserId: req.params.userId } });
        if (!membership) return res.status(404).json({ error: 'Member not found' });
        await membership.destroy();
        res.json({ message: 'Member removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Static fallback must be last
app.use(express.static(path.join(__dirname, '../dist')));
app.get(/^\/(?!api).*/, (req, res) => {
    const indexPath = path.join(__dirname, '../dist/index.html');
    try {
        if (!fs.existsSync(indexPath)) {
            return res.status(404).send('Not found');
        }
        res.sendFile(indexPath);
    } catch {
        res.status(500).send('Server error');
    }
});
app.post('/api/uploads/image', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const url = `/uploads/${req.file.filename}`;
        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handler to ensure JSON responses (including Multer errors)
app.use((err, req, res, next) => {
    if (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Server error' });
    } else {
        next();
    }
});
