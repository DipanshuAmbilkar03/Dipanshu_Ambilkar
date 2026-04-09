const express = require("express");
const mongoose = require('mongoose');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 8080;
const path = require("path");
const fs = require('fs');
const Project = require('./model/project');
const GalleryImage = require('./model/gallery');

const LEETCODE_USERNAME = 'dipanshu0312';
const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

async function queryLeetCode(query, variables, timeoutMs = 4500) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(LEETCODE_GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, variables }),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`LeetCode API request failed with status ${response.status}`);
        }

        return response.json();
    } finally {
        clearTimeout(timeoutHandle);
    }
}

function formatLeetCodeIcon(iconPath) {
    if (!iconPath) return '';
    if (iconPath.startsWith('http')) return iconPath;
    return `https://leetcode.com${iconPath}`;
}

function buildLeetCodeHeatmap(submissionMap, days = 182) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entries = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);

        const unixDay = Math.floor(Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        ) / 1000);

        entries.push({
            date: date.toISOString().slice(0, 10),
            count: Number(submissionMap[unixDay] || 0),
        });
    }

    return entries;
}

async function fetchLeetCodeStats(username) {
    const profileQuery = `
        query userPublicProfile($username: String!) {
            matchedUser(username: $username) {
                profile {
                    ranking
                }
                submitStatsGlobal {
                    acSubmissionNum {
                        difficulty
                        count
                        submissions
                    }
                }
                badges {
                    id
                    displayName
                    icon
                    creationDate
                }
            }
        }
    `;

    const calendarQuery = `
        query userProfileCalendar($username: String!, $year: Int) {
            matchedUser(username: $username) {
                userCalendar(year: $year) {
                    streak
                    totalActiveDays
                    submissionCalendar
                }
            }
        }
    `;

    const contestQuery = `
        query userContestData($username: String!) {
            userContestRanking(username: $username) {
                rating
                globalRanking
                attendedContestsCount
                topPercentage
            }
            userContestRankingHistory(username: $username) {
                attended
                rating
                ranking
                contest {
                    title
                    startTime
                }
            }
        }
    `;

    try {
        const currentYear = new Date().getFullYear();
        const [profileResponse, calendarResponse, contestResponse] = await Promise.all([
            queryLeetCode(profileQuery, { username }),
            queryLeetCode(calendarQuery, { username, year: currentYear }),
            queryLeetCode(contestQuery, { username }),
        ]);

        const profileUser = profileResponse?.data?.matchedUser;
        const calendarUser = calendarResponse?.data?.matchedUser;

        if (!profileUser || !calendarUser) {
            return null;
        }

        const allStats = profileUser.submitStatsGlobal?.acSubmissionNum || [];
        const statMap = allStats.reduce((acc, item) => {
            acc[item.difficulty] = item;
            return acc;
        }, {});

        const totalSolved = statMap.All?.count || 0;
        const totalSubmissions = statMap.All?.submissions || 0;
        const acceptance = totalSubmissions
            ? ((totalSolved / totalSubmissions) * 100).toFixed(2)
            : '0.00';

        const calendar = calendarUser.userCalendar || {};
        const rawCalendar = calendar.submissionCalendar || '{}';
        let parsedCalendar = {};

        try {
            parsedCalendar = JSON.parse(rawCalendar);
        } catch (error) {
            parsedCalendar = {};
        }

        const activeDaysThisYear = Object.keys(parsedCalendar).length;
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const elapsedDays = Math.max(
            1,
            Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1
        );
        const consistencyScore = Math.min(100, Math.round((activeDaysThisYear / elapsedDays) * 100));
        const heatmap = buildLeetCodeHeatmap(parsedCalendar, 182);

        const contestRanking = contestResponse?.data?.userContestRanking || null;
        const contestHistory = (contestResponse?.data?.userContestRankingHistory || [])
            .filter((entry) => entry?.attended && entry?.contest && Number.isFinite(entry?.rating))
            .sort((a, b) => (a.contest.startTime || 0) - (b.contest.startTime || 0))
            .slice(-12)
            .map((entry) => {
                const contestDate = entry.contest.startTime
                    ? new Date(entry.contest.startTime * 1000).toISOString().slice(0, 10)
                    : '';

                return {
                    title: entry.contest.title,
                    shortTitle: entry.contest.title
                        .replace('Weekly Contest ', 'W ')
                        .replace('Biweekly Contest ', 'B '),
                    date: contestDate,
                    rating: Number(entry.rating.toFixed(2)),
                    ranking: entry.ranking,
                };
            });

        const badges = (profileUser.badges || [])
            .slice()
            .sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate))
            .slice(0, 3)
            .map((badge) => ({
                name: badge.displayName,
                icon: formatLeetCodeIcon(badge.icon),
                createdAt: badge.creationDate,
            }));

        return {
            username,
            profileUrl: `https://leetcode.com/u/${username}/`,
            ranking: profileUser.profile?.ranking || null,
            totalSolved,
            acceptance,
            currentStreak: calendar.streak || 0,
            totalActiveDays: calendar.totalActiveDays || 0,
            activeDaysThisYear,
            currentYear,
            consistencyScore,
            easySolved: statMap.Easy?.count || 0,
            mediumSolved: statMap.Medium?.count || 0,
            hardSolved: statMap.Hard?.count || 0,
            badges,
            heatmap,
            contest: {
                rating: contestRanking?.rating ? Number(contestRanking.rating.toFixed(2)) : null,
                globalRanking: contestRanking?.globalRanking || null,
                attendedContests: contestRanking?.attendedContestsCount || contestHistory.length,
                topPercentage: contestRanking?.topPercentage || null,
                history: contestHistory,
            },
        };
    } catch (error) {
        console.error('Unable to fetch LeetCode stats:', error.message);
        return null;
    }
}

//middleware
app.use("/photo", express.static(path.join(__dirname, "init", "photo")));
app.use('/homeImages', express.static(path.join(__dirname, 'init/homeImages')));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const MONGO_URL = process.env.MONGO_URL || (process.env.VERCEL === '1' ? '' : 'mongodb://127.0.0.1:27017/pfp');
let connectionPromise;

async function connectDB() {
    if (!MONGO_URL) {
        throw new Error('MONGO_URL is not set.');
    }

    if (mongoose.connection.readyState === 1) {
        return;
    }

    if (!connectionPromise) {
        connectionPromise = mongoose
            .connect(MONGO_URL)
            .then(() => {
                console.log('Connected to MongoDB');
            })
            .catch((error) => {
                connectionPromise = null;
                throw error;
            });
    }

    await connectionPromise;
}

if (process.env.VERCEL !== '1') {
    connectDB().catch((err) => console.log('DB connection error:', err.message));
}

app.get('/projects', async (req, res) => {
    try {
        await connectDB();
        const allProjects = await Project.find({}).sort({ order: 1, createdAt: -1 });
        res.render('projects.ejs', { projects: allProjects });
    } catch (err) {
        res.status(500).send("Error fetching projects");
    }
});

app.get('/gallery', async (req, res) => {
    try {
        await connectDB();
        const images = await GalleryImage.find({}).sort({ uploadedAt: -1 });
        res.render('gallery.ejs', { images });
    } catch (err) {
        res.status(500).send('Error loading gallery');
    }
});

app.get('/', async (req, res) => {
    const imageDir = path.join(__dirname, 'init/homeImages');

    try {
        const [files, leetcode] = await Promise.all([
            fs.promises.readdir(imageDir),
            fetchLeetCodeStats(LEETCODE_USERNAME),
        ]);

        const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
        res.render('main/home.ejs', { images, leetcode });
    } catch (error) {
        console.log("Error loading home page data:", error);
        res.send("Error in image loading");
    }
});

app.get("/certificate",(req,res) => {
    res.render('certificate.ejs');
});

if (process.env.VERCEL !== '1') {
    app.listen(port,() => {
        console.log(`listening to port ${port}`);
        console.log(`http://localhost:${port}/`);
    });
}

module.exports = app;