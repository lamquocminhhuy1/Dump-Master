const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Ensure data directory exists or use a default location
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
});

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'user'
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bio: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    displayName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

const Dump = sequelize.define('Dump', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    questions: {
        type: DataTypes.JSON, // Store questions array as JSON
        allowNull: false
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    timeLimit: {
        type: DataTypes.INTEGER, // in minutes, 0 = no limit
        defaultValue: 0
    },
    showAnswerImmediately: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'Uncategorized'
    }
});

const History = sequelize.define('History', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    total: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    dumpName: {
        type: DataTypes.STRING
    },
    answers: {
        type: DataTypes.JSON, // Store user's answers { questionIndex: selectedOption }
        allowNull: true
    }
});

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    code: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

const Group = sequelize.define('Group', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

const GroupRole = sequelize.define('GroupRole', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    canCreate: { type: DataTypes.BOOLEAN, defaultValue: false },
    canRead: { type: DataTypes.BOOLEAN, defaultValue: true },
    canUpdate: { type: DataTypes.BOOLEAN, defaultValue: false },
    canDelete: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const GroupMember = sequelize.define('GroupMember', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    }
});

const GroupInvitation = sequelize.define('GroupInvitation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    token: {
        type: DataTypes.STRING,
        allowNull: false
    },
    inviteeUsername: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending'
    }
});

const GroupDump = sequelize.define('GroupDump', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    canEdit: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// Relationships
User.hasMany(Dump);
Dump.belongsTo(User);

User.hasMany(History);
History.belongsTo(User);

Dump.hasMany(History);
History.belongsTo(Dump);

User.hasMany(Group);
Group.belongsTo(User);

Group.hasMany(GroupRole);
GroupRole.belongsTo(Group);

Group.belongsToMany(User, { through: GroupMember });
User.belongsToMany(Group, { through: GroupMember });
// Explicit associations for includes
GroupMember.belongsTo(User);
User.hasMany(GroupMember);
GroupMember.belongsTo(Group);
Group.hasMany(GroupMember);
GroupMember.belongsTo(GroupRole);
GroupRole.hasMany(GroupMember);

Group.belongsToMany(Dump, { through: GroupDump });
Dump.belongsToMany(Group, { through: GroupDump });

GroupInvitation.belongsTo(Group);
Group.hasMany(GroupInvitation);
GroupInvitation.belongsTo(User, { as: 'inviter' });

// Category visibility and ownership by Group (optional)
Category.belongsTo(Group);
Group.hasMany(Category);

// Questions as records belonging to dumps
const Question = sequelize.define('Question', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    text: {
        type: DataTypes.STRING,
        allowNull: false
    },
    optionA: { type: DataTypes.STRING, allowNull: true },
    optionB: { type: DataTypes.STRING, allowNull: true },
    optionC: { type: DataTypes.STRING, allowNull: true },
    optionD: { type: DataTypes.STRING, allowNull: true },
    correctAnswer: { type: DataTypes.STRING, allowNull: false }
});
Dump.hasMany(Question);
Question.belongsTo(Dump);

module.exports = { sequelize, User, Dump, History, Category, Group, GroupRole, GroupMember, GroupInvitation, GroupDump, Question };
