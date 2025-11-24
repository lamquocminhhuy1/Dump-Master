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
    }
});

// Relationships
User.hasMany(Dump);
Dump.belongsTo(User);

User.hasMany(History);
History.belongsTo(User);

Dump.hasMany(History);
History.belongsTo(Dump);

module.exports = { sequelize, User, Dump, History, Category };
