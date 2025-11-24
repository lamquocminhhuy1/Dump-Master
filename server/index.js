const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const { sequelize, User, Dump, History, Category } = require('./models');
const { Op } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer for avatar uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'))
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage });

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
        const { username, password } = req.body;
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
        res.status(400).json({ error: error.message });
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
        if (bio !== undefined) updateData.bio = bio;
        if (email !== undefined) updateData.email = email;
        if (displayName !== undefined) updateData.displayName = displayName;
        if (location !== undefined) updateData.location = location;
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
        const { type, search, category } = req.query; // 'my' or 'public', search term, category
        let whereClause = {};

        if (type === 'public') {
            whereClause.isPublic = true;
        } else {
            whereClause.UserId = req.user.id;
        }

        if (search) {
            whereClause.name = { [Op.like]: `%${search}%` };
        }

        // Only filter by category if it's specified and not 'All'
        if (category && category !== 'All' && category !== '' && category !== 'undefined') {
            whereClause.category = category;
        }

        const dumps = await Dump.findAll({
            where: whereClause,
            include: [{ model: User, attributes: ['username', 'avatar'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(dumps);
    } catch (error) {
        console.error('Error in GET /api/dumps:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/dumps', authenticateToken, async (req, res) => {
    try {
        const { name, questions, isPublic, timeLimit, showAnswerImmediately, category } = req.body;
        const dump = await Dump.create({
            name,
            questions,
            isPublic: isPublic || false,
            timeLimit: timeLimit || 0,
            showAnswerImmediately: showAnswerImmediately !== undefined ? showAnswerImmediately : true,
            category: category || 'Uncategorized',
            UserId: req.user.id
        });
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

        const { name, questions, isPublic, timeLimit, showAnswerImmediately, category } = req.body;
        await dump.update({
            name,
            questions,
            isPublic,
            timeLimit,
            showAnswerImmediately,
            category
        });
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
        const flattenedQuestions = dump.questions.map(q => ({
            question: q.question || '',
            optionA: q.options?.A || '',
            optionB: q.options?.B || '',
            optionC: q.options?.C || '',
            optionD: q.options?.D || '',
            correctAnswer: q.correctAnswer || ''
        }));

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

        const history = await History.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/history', authenticateToken, async (req, res) => {
    try {
        const { dumpId, dumpName, score, total, answers } = req.body;
        const history = await History.create({
            UserId: req.user.id,
            DumpId: dumpId,
            dumpName,
            score,
            total,
            answers
        });
        res.json(history);
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
        const { code, name, description } = req.body;
        if (!code || !name) {
            return res.status(400).json({ error: 'Code and name are required' });
        }

        const category = await Category.create({ code, name, description });
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
        const { code, name, description } = req.body;
        const category = await Category.findByPk(req.params.id);
        if (!category) return res.status(404).json({ error: 'Category not found' });

        await category.update({ code, name, description });
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


// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, '../dist')));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Initialize DB and Start Server
sequelize.sync().then(async () => {
    console.log('Database synced');

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
