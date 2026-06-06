const express = require("express");
const mongoose = require('mongoose');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 8080;
const path = require("path");
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const Project = require('./model/project');
const GalleryImage = require('./model/gallery');
const Certificate = require('./model/certificate');
const SiteContent = require('./model/siteContent');

const LEETCODE_USERNAME = 'dipanshu0312';
const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'portfolio-admin').trim();
const ADMIN_COOKIE_SECRET = (process.env.ADMIN_COOKIE_SECRET || process.env.ADMIN_PASSWORD || 'portfolio-admin-secret').trim();
const ADMIN_COOKIE_NAME = 'portfolio_admin';
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const CLOUDINARY_FOLDER = (process.env.CLOUDINARY_FOLDER || 'portfolio')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9/_-]+/gi, '-');
const PARSED_MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 4);
const MAX_UPLOAD_MB = Number.isFinite(PARSED_MAX_UPLOAD_MB) && PARSED_MAX_UPLOAD_MB > 0 ? PARSED_MAX_UPLOAD_MB : 4;
const MAX_UPLOAD_BYTES = Math.max(1, MAX_UPLOAD_MB) * 1024 * 1024;
const CLOUDINARY_CONFIGURED = Boolean(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
} else if (CLOUDINARY_CONFIGURED) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
}

const DEFAULT_SITE_CONTENT = {
    heroRoles: 'Developer | Data Engineer | Designer',
    heroLead: 'I build practical AI, IoT, and full-stack products with a focus on resilient systems, clean interfaces, and measurable impact.',
    resumeSummary: 'Third-year engineering student focused on full-stack systems, AI integrations, IoT prototypes, and research-backed product work.',
    resumeUrl: '',
    skillGroups: [
        { title: 'Languages', skills: ['Java', 'Python', 'JavaScript', 'SQL'] },
        { title: 'Frontend', skills: ['HTML', 'CSS', 'Responsive UI', 'Canvas', 'Accessibility'] },
        { title: 'Backend', skills: ['Node.js', 'Express', 'MongoDB', 'REST APIs', 'Auth'] },
        { title: 'AI & Data', skills: ['Machine Learning', 'Scikit-Learn', 'Gemini', 'OpenAI APIs', 'Data Analysis'] },
        { title: 'Tools', skills: ['Git', 'Vercel', 'Figma', 'CATIA', 'Research Writing'] },
    ],
    resumeItems: [
        {
            title: 'Full-Stack & AI Developer',
            organization: 'Portfolio Projects',
            period: '2025 - Present',
            description: 'Building MERN systems, AI assistants, admin dashboards, and data-driven interfaces with responsive production UI.',
        },
        {
            title: 'IoT Research & Hackathon Lead',
            organization: 'Campus + IEEE Work',
            period: '2024 - 2026',
            description: 'Led RFID and groundwater monitoring prototypes, research presentations, and hardware-backed alerting workflows.',
        },
        {
            title: 'Academic Performer',
            organization: 'Engineering Coursework',
            period: '2023 - Present',
            description: 'Maintaining high semester performance while pairing backend engineering, design, data analysis, and research delivery.',
        },
    ],
};

const DEFAULT_CERTIFICATES = [
    { title: 'IEEE PuneCon 2025', description: 'International Conference Paper Presentation', image: '/assets/certificates/ieee2025.png', order: 1 },
    { title: 'NPTEL Certification', description: 'National Programme on Technology Enhanced Learning', image: '/assets/certificates/nptel.png', order: 2 },
    { title: 'Business Analytics & Humanities', description: 'Interdisciplinary Academic Program', image: '/assets/certificates/BAH.jpg', order: 3 },
    { title: 'ICRTAIDS Conference', description: 'International Research Conference Participation', image: '/assets/certificates/icrtaids.jpg', order: 4 },
    { title: 'LeetCode 100 Days Badge', description: 'Consistency milestone on coding streaks', image: '/assets/certificates/leetcode100days.png', order: 5 },
    { title: 'Internal Hackathon 2024', description: 'Problem Solving & Team Collaboration', image: '/assets/certificates/internalhackthon2024.png', order: 6 },
    { title: 'Internal Hackathon 2025', description: 'Innovation & Technical Implementation', image: '/assets/certificates/internalhackthon2025.png', order: 7 },
    { title: 'EDA Hackathon', description: 'Exploratory Data Analysis & Insights', image: '/assets/certificates/eda.png', order: 8 },
    { title: 'Web Design Certification', description: 'Frontend Design & UI Development', image: '/assets/certificates/webdesign.jpg', order: 9 },
    { title: 'IBM Artificial Intelligence', description: 'AI & Data Science Foundations', image: '/assets/certificates/ibmAI.png', order: 10 },
    { title: 'Artificial Intelligence', description: 'Core AI Concepts & Applications', image: '/assets/certificates/ai.png', order: 11 },
    { title: 'Advanced Python Programming', description: 'Data Structures, OOP & Libraries', image: '/assets/certificates/advencedpython.png', order: 12 },
];

function isPdfFile(file) {
    return file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf';
}

function isImageFile(file) {
    return file.mimetype.startsWith('image/');
}

function createMemoryUpload({ allowPdf = false, allowImage = false, message }) {
    return multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: MAX_UPLOAD_BYTES,
        },
        fileFilter: (req, file, cb) => {
            const allowed = (allowPdf && isPdfFile(file)) || (allowImage && isImageFile(file));
            cb(allowed ? null : new Error(message), allowed);
        },
    });
}

const resumeUpload = createMemoryUpload({
    allowPdf: true,
    message: 'Only PDF resume files are allowed.',
}).single('resumePdf');

const projectImageUpload = createMemoryUpload({
    allowImage: true,
    message: 'Only image files are allowed for project previews.',
}).single('projectImage');

const certificateUpload = createMemoryUpload({
    allowPdf: true,
    allowImage: true,
    message: 'Only image or PDF files are allowed for certificates.',
}).fields([
    { name: 'certificateImage', maxCount: 1 },
    { name: 'certificateFullImage', maxCount: 1 },
]);

const galleryImageUpload = createMemoryUpload({
    allowImage: true,
    message: 'Only image files are allowed for gallery uploads.',
}).single('galleryImage');

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
app.use(express.urlencoded({ extended: true }));
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

function parseCookies(cookieHeader = '') {
    return cookieHeader.split(';').reduce((cookies, pair) => {
        const [rawName, ...rawValue] = pair.trim().split('=');
        if (!rawName) return cookies;
        cookies[rawName] = decodeURIComponent(rawValue.join('=') || '');
        return cookies;
    }, {});
}

function getAdminToken() {
    return crypto
        .createHmac('sha256', ADMIN_COOKIE_SECRET)
        .update(ADMIN_PASSWORD)
        .digest('hex');
}

function isAdminAuthenticated(req) {
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies[ADMIN_COOKIE_NAME] || '';
    const expectedToken = getAdminToken();

    if (token.length !== expectedToken.length) return false;
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
}

function requireAdmin(req, res, next) {
    if (isAdminAuthenticated(req)) {
        return next();
    }

    return res.redirect('/admin/login');
}

function redirectWithMessage(res, pathName, message) {
    const [basePath, anchor] = pathName.split('#');
    const hash = anchor ? `#${anchor}` : '';
    return res.redirect(`${basePath}?message=${encodeURIComponent(message)}${hash}`);
}

function normalizeNumber(value, fallback = 999) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value) {
    return String(value || '').trim();
}

function splitCsv(value) {
    return normalizeText(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function isRuntimeLocalUploadUrl(value) {
    return normalizeText(value).startsWith('/uploads/');
}

function isHttpUrl(value) {
    try {
        const url = new URL(normalizeText(value));
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function getLocalUploadPath(uploadUrl) {
    const cleanUrl = normalizeText(uploadUrl).split('?')[0].replace(/\\/g, '/');
    if (!isRuntimeLocalUploadUrl(cleanUrl)) return '';

    const uploadsRoot = path.resolve(__dirname, 'public', 'uploads');
    const filePath = path.resolve(__dirname, 'public', cleanUrl.replace(/^\/+/, ''));

    if (!filePath.startsWith(`${uploadsRoot}${path.sep}`)) return '';
    return filePath;
}

function getResumeFileName(content = {}, resumeUrl = '') {
    let urlName = '';

    try {
        if (isHttpUrl(resumeUrl)) {
            urlName = path.basename(new URL(resumeUrl).pathname);
        } else {
            urlName = path.basename(normalizeText(resumeUrl).split('?')[0]);
        }
    } catch (error) {
        urlName = '';
    }

    const rawName = normalizeText(content.resumeOriginalName) || normalizeText(content.resumeFileName) || urlName || 'resume.pdf';
    const safeName = rawName
        .replace(/["]/g, '')
        .replace(/[^a-z0-9._ -]+/gi, '-')
        .trim() || 'resume.pdf';

    return safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;
}

function getInlinePdfHeaders(fileName) {
    return {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': IS_PRODUCTION ? 'public, max-age=300' : 'no-store',
    };
}

function getDeployWarnings() {
    return [
        !MONGO_URL ? 'MONGO_URL is required for deployed projects, certificates, gallery, and admin content.' : '',
        !process.env.ADMIN_PASSWORD ? 'ADMIN_PASSWORD is required in production so the fallback password is never exposed.' : '',
        !process.env.ADMIN_COOKIE_SECRET ? 'ADMIN_COOKIE_SECRET is required in production to keep admin sessions stable and private.' : '',
        !CLOUDINARY_CONFIGURED ? 'Cloudinary credentials are required before uploading resume PDFs, project images, certificate files, or gallery images.' : '',
    ].filter(Boolean);
}

function runUpload(uploadMiddleware, req, res) {
    return new Promise((resolve, reject) => {
        uploadMiddleware(req, res, (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

function getCloudinaryResourceType(file) {
    return isPdfFile(file) ? 'raw' : 'image';
}

function getCloudinaryFolder(section) {
    return [CLOUDINARY_FOLDER, section]
        .filter(Boolean)
        .join('/')
        .replace(/\/+/g, '/');
}

function uploadToCloudinary(file, section) {
    if (!CLOUDINARY_CONFIGURED) {
        throw new Error('Cloudinary is not configured. Add Cloudinary credentials to your environment variables.');
    }

    const resourceType = getCloudinaryResourceType(file);

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: getCloudinaryFolder(section),
                resource_type: resourceType,
                use_filename: true,
                unique_filename: true,
                overwrite: false,
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    resourceType: result.resource_type || resourceType,
                    originalName: file.originalname,
                });
            }
        );

        uploadStream.end(file.buffer);
    });
}

async function deleteCloudinaryAsset(publicId, resourceType = 'image') {
    if (!publicId || !CLOUDINARY_CONFIGURED) return;

    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType || 'image',
            invalidate: true,
        });
    } catch (error) {
        console.log('Could not remove Cloudinary asset:', error.message);
    }
}

function formatAdminDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function parseSkillGroupsInput(value) {
    return normalizeText(value)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [titlePart, skillsPart = ''] = line.split(':');
            return {
                title: normalizeText(titlePart),
                skills: splitCsv(skillsPart),
            };
        })
        .filter((group) => group.title && group.skills.length);
}

function formatSkillGroupsInput(groups = []) {
    return groups
        .map((group) => `${group.title}: ${(group.skills || []).join(', ')}`)
        .join('\n');
}

function parseResumeItemsInput(value) {
    return normalizeText(value)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [title = '', organization = '', period = '', description = ''] = line.split('|').map((part) => part.trim());
            return { title, organization, period, description };
        })
        .filter((item) => item.title);
}

function formatResumeItemsInput(items = []) {
    return items
        .map((item) => [item.title, item.organization, item.period, item.description].join(' | '))
        .join('\n');
}

function getContentValue(content, key) {
    return normalizeText(content?.[key]) || DEFAULT_SITE_CONTENT[key];
}

function mergeSiteContent(content) {
    const skillGroups = content?.skillGroups?.length ? content.skillGroups : DEFAULT_SITE_CONTENT.skillGroups;
    const resumeItems = content?.resumeItems?.length ? content.resumeItems : DEFAULT_SITE_CONTENT.resumeItems;

    return {
        heroRoles: getContentValue(content, 'heroRoles'),
        heroLead: getContentValue(content, 'heroLead'),
        resumeSummary: getContentValue(content, 'resumeSummary'),
        resumeUrl: normalizeText(content?.resumeUrl) || DEFAULT_SITE_CONTENT.resumeUrl,
        resumeFileName: normalizeText(content?.resumeFileName),
        resumeOriginalName: normalizeText(content?.resumeOriginalName),
        resumePublicId: normalizeText(content?.resumePublicId),
        resumeResourceType: normalizeText(content?.resumeResourceType),
        resumeUploadedAt: content?.resumeUploadedAt || null,
        skillGroups,
        resumeItems,
    };
}

async function getSiteContent() {
    try {
        await connectDB();
        const content = await SiteContent.findOne({ key: 'main' }).lean();
        return mergeSiteContent(content);
    } catch (err) {
        return mergeSiteContent(null);
    }
}

async function getPublicCertificates() {
    try {
        await connectDB();
        const certificates = await Certificate.find({ visible: true }).sort({ order: 1, createdAt: -1 }).lean();
        if (certificates.length) return certificates;
    } catch (err) {
        // Public portfolio falls back to static certificates when the editor database is unavailable.
    }

    return DEFAULT_CERTIFICATES.map((certificate) => ({
        ...certificate,
        fullImage: certificate.image,
        visible: true,
    }));
}

function certificateFromBody(body, imageAsset = null, fullImageAsset = null) {
    const image = imageAsset?.url || normalizeText(body.image) || fullImageAsset?.url || normalizeText(body.fullImage);
    const certificate = {
        title: normalizeText(body.title),
        description: normalizeText(body.description),
        issuer: normalizeText(body.issuer),
        image,
        fullImage: fullImageAsset?.url || normalizeText(body.fullImage) || image,
        order: normalizeNumber(body.order),
        visible: body.visible === 'on',
    };

    if (imageAsset) {
        certificate.imagePublicId = imageAsset.publicId;
        certificate.imageResourceType = imageAsset.resourceType;
    }

    if (fullImageAsset) {
        certificate.fullImagePublicId = fullImageAsset.publicId;
        certificate.fullImageResourceType = fullImageAsset.resourceType;
    }

    return certificate;
}

function projectFromBody(body, imageAsset = null) {
    const project = {
        title: normalizeText(body.title),
        description: normalizeText(body.description),
        image: imageAsset?.url || normalizeText(body.image),
        githubLink: normalizeText(body.githubLink),
        liveLink: normalizeText(body.liveLink),
        order: normalizeNumber(body.order),
        technologies: splitCsv(body.technologies),
    };

    if (imageAsset) {
        project.imagePublicId = imageAsset.publicId;
        project.imageResourceType = imageAsset.resourceType;
    }

    return project;
}

function galleryFromBody(body, imageAsset = null) {
    const imageUrl = imageAsset?.url || normalizeText(body.imageUrl);
    const filename = imageAsset?.originalName || normalizeText(body.filename) || path.basename(imageUrl);

    return {
        filename,
        imageUrl,
        imagePublicId: imageAsset?.publicId || normalizeText(body.imagePublicId),
        imageResourceType: imageAsset?.resourceType || normalizeText(body.imageResourceType),
        caption: normalizeText(body.caption),
    };
}

function getResumeDisplay(content) {
    const resumeUrl = normalizeText(content.resumeUrl);
    const uploadedName = normalizeText(content.resumeOriginalName) || normalizeText(content.resumeFileName);

    return {
        hasResume: Boolean(resumeUrl),
        url: resumeUrl,
        label: uploadedName || (resumeUrl ? path.basename(resumeUrl) || resumeUrl : 'No PDF resume uploaded yet'),
        uploadedAt: formatAdminDate(content.resumeUploadedAt),
        isCloudinaryFile: Boolean(content.resumePublicId),
        needsCloudinaryMigration: isRuntimeLocalUploadUrl(resumeUrl),
    };
}

function buildAdminOverview(projects, certificates, galleryImages, content) {
    const skillsCount = (content.skillGroups || []).reduce((total, group) => total + (group.skills || []).length, 0);
    const visibleCertificates = certificates.filter((certificate) => certificate.visible !== false).length;
    const hiddenCertificates = Math.max(certificates.length - visibleCertificates, 0);

    return {
        stats: [
            { label: 'Projects', value: projects.length, detail: 'case studies on the site' },
            { label: 'Certificates', value: certificates.length, detail: `${visibleCertificates} visible${hiddenCertificates ? `, ${hiddenCertificates} hidden` : ''}` },
            { label: 'Gallery', value: galleryImages.length, detail: 'photos in the gallery' },
            { label: 'Skills', value: skillsCount, detail: `${(content.skillGroups || []).length} groups` },
        ],
        latestProjects: projects.slice(0, 4),
        latestCertificates: certificates.slice(0, 4),
        latestGalleryImages: galleryImages.slice(0, 6),
        resume: getResumeDisplay(content),
        resumeItemsCount: (content.resumeItems || []).length,
    };
}

if (process.env.VERCEL !== '1') {
    connectDB().catch((err) => console.log('DB connection error:', err.message));
}

app.get('/admin/login', (req, res) => {
    res.render('admin/login.ejs', {
        message: req.query.message || '',
        usingDefaultPassword: !process.env.ADMIN_PASSWORD,
        deployWarnings: getDeployWarnings(),
        maxUploadMb: MAX_UPLOAD_MB,
    });
});

app.post('/admin/login', (req, res) => {
    if (IS_PRODUCTION && (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_COOKIE_SECRET)) {
        return res.status(503).send('Admin credentials are not configured for production.');
    }

    if (normalizeText(req.body.password) !== ADMIN_PASSWORD) {
        return redirectWithMessage(res, '/admin/login', 'Invalid password.');
    }

    res.cookie(ADMIN_COOKIE_NAME, getAdminToken(), {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 8,
    });
    return res.redirect('/admin');
});

app.post('/admin/logout', requireAdmin, (req, res) => {
    res.clearCookie(ADMIN_COOKIE_NAME);
    res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, async (req, res) => {
    try {
        await connectDB();
        const [projects, certificates, galleryImages, rawContent] = await Promise.all([
            Project.find({}).sort({ order: 1, createdAt: -1 }).lean(),
            Certificate.find({}).sort({ order: 1, createdAt: -1 }).lean(),
            GalleryImage.find({}).sort({ uploadedAt: -1 }).lean(),
            SiteContent.findOne({ key: 'main' }).lean(),
        ]);
        const content = mergeSiteContent(rawContent);
        const adminOverview = buildAdminOverview(projects, certificates, galleryImages, content);

        res.render('admin/dashboard.ejs', {
            projects,
            certificates,
            galleryImages,
            content,
            adminOverview,
            resumeDisplay: adminOverview.resume,
            skillGroupsInput: formatSkillGroupsInput(content.skillGroups),
            resumeItemsInput: formatResumeItemsInput(content.resumeItems),
            defaultCertificatesCount: DEFAULT_CERTIFICATES.length,
            usingFallbackCertificates: certificates.length === 0,
            usingDefaultPassword: !process.env.ADMIN_PASSWORD,
            cloudinaryConfigured: CLOUDINARY_CONFIGURED,
            deployWarnings: getDeployWarnings(),
            maxUploadMb: MAX_UPLOAD_MB,
            message: req.query.message || '',
        });
    } catch (err) {
        res.status(500).send('Error loading admin dashboard');
    }
});

app.post('/admin/content', requireAdmin, async (req, res) => {
    try {
        await connectDB();
        await SiteContent.findOneAndUpdate(
            { key: 'main' },
            {
                key: 'main',
                heroRoles: normalizeText(req.body.heroRoles),
                heroLead: normalizeText(req.body.heroLead),
                skillGroups: parseSkillGroupsInput(req.body.skillGroups),
                updatedAt: new Date(),
            },
            { upsert: true, runValidators: true }
        );
        return redirectWithMessage(res, '/admin#content', 'Portfolio content updated.');
    } catch (err) {
        return redirectWithMessage(res, '/admin#content', 'Could not update portfolio content.');
    }
});

app.post('/admin/resume/upload', requireAdmin, async (req, res) => {
    let uploadedResume = null;

    try {
        await runUpload(resumeUpload, req, res);
        if (!req.file) {
            return redirectWithMessage(res, '/admin#resume-manager', 'Choose a PDF resume before uploading.');
        }

        await connectDB();
        const previousContent = await SiteContent.findOne({ key: 'main' }).lean();
        uploadedResume = await uploadToCloudinary(req.file, 'resume');

        await SiteContent.findOneAndUpdate(
            { key: 'main' },
            {
                $set: {
                    resumeUrl: uploadedResume.url,
                    resumeFileName: path.basename(uploadedResume.url),
                    resumeOriginalName: uploadedResume.originalName,
                    resumePublicId: uploadedResume.publicId,
                    resumeResourceType: uploadedResume.resourceType,
                    resumeUploadedAt: new Date(),
                    updatedAt: new Date(),
                },
                $setOnInsert: { key: 'main' },
            },
            { upsert: true, runValidators: true }
        );

        if (previousContent?.resumePublicId && previousContent.resumePublicId !== uploadedResume.publicId) {
            await deleteCloudinaryAsset(previousContent.resumePublicId, previousContent.resumeResourceType || 'raw');
        }

        return redirectWithMessage(res, '/admin#resume-manager', 'Resume PDF uploaded to Cloudinary and linked in the navbar.');
    } catch (err) {
        if (uploadedResume?.publicId) {
            await deleteCloudinaryAsset(uploadedResume.publicId, uploadedResume.resourceType || 'raw');
        }

        return redirectWithMessage(res, '/admin#resume-manager', err.message || 'Could not upload resume PDF.');
    }
});

app.post('/admin/resume/link', requireAdmin, async (req, res) => {
    const resumeUrl = normalizeText(req.body.resumeUrl);

    if (!resumeUrl) {
        return redirectWithMessage(res, '/admin#resume-manager', 'Enter a resume URL or upload a PDF.');
    }

    try {
        await connectDB();
        const previousContent = await SiteContent.findOne({ key: 'main' }).lean();

        await SiteContent.findOneAndUpdate(
            { key: 'main' },
            {
                $set: {
                    resumeUrl,
                    resumeFileName: '',
                    resumeOriginalName: '',
                    resumePublicId: '',
                    resumeResourceType: '',
                    resumeUploadedAt: null,
                    updatedAt: new Date(),
                },
                $setOnInsert: { key: 'main' },
            },
            { upsert: true, runValidators: true }
        );

        if (previousContent?.resumePublicId && previousContent.resumeUrl !== resumeUrl) {
            await deleteCloudinaryAsset(previousContent.resumePublicId, previousContent.resumeResourceType || 'raw');
        }

        return redirectWithMessage(res, '/admin#resume-manager', 'Resume link updated.');
    } catch (err) {
        return redirectWithMessage(res, '/admin#resume-manager', 'Could not update resume link.');
    }
});

app.post('/admin/resume/delete', requireAdmin, async (req, res) => {
    try {
        await connectDB();
        const previousContent = await SiteContent.findOne({ key: 'main' }).lean();

        await SiteContent.findOneAndUpdate(
            { key: 'main' },
            {
                $set: {
                    resumeUrl: '',
                    resumeFileName: '',
                    resumeOriginalName: '',
                    resumePublicId: '',
                    resumeResourceType: '',
                    resumeUploadedAt: null,
                    updatedAt: new Date(),
                },
                $setOnInsert: { key: 'main' },
            },
            { upsert: true, runValidators: true }
        );

        await deleteCloudinaryAsset(previousContent?.resumePublicId, previousContent?.resumeResourceType || 'raw');
        return redirectWithMessage(res, '/admin#resume-manager', 'Resume removed from the public navbar.');
    } catch (err) {
        return redirectWithMessage(res, '/admin#resume-manager', 'Could not remove resume.');
    }
});

app.post('/admin/projects', requireAdmin, async (req, res) => {
    let uploadedImage = null;

    try {
        await runUpload(projectImageUpload, req, res);
        await connectDB();
        uploadedImage = req.file ? await uploadToCloudinary(req.file, 'projects') : null;
        await Project.create(projectFromBody(req.body, uploadedImage));
        return redirectWithMessage(res, '/admin#projects', uploadedImage ? 'Project added with Cloudinary image.' : 'Project added.');
    } catch (err) {
        if (uploadedImage?.publicId) {
            await deleteCloudinaryAsset(uploadedImage.publicId, uploadedImage.resourceType);
        }

        return redirectWithMessage(res, '/admin#projects', err.message || 'Could not add project. Title and description are required.');
    }
});

app.post('/admin/projects/:id', requireAdmin, async (req, res) => {
    let uploadedImage = null;

    try {
        await runUpload(projectImageUpload, req, res);
        await connectDB();
        const previousProject = await Project.findById(req.params.id).lean();
        uploadedImage = req.file ? await uploadToCloudinary(req.file, 'projects') : null;

        await Project.findByIdAndUpdate(req.params.id, projectFromBody(req.body, uploadedImage), { runValidators: true });

        if (uploadedImage?.publicId && previousProject?.imagePublicId && previousProject.imagePublicId !== uploadedImage.publicId) {
            await deleteCloudinaryAsset(previousProject.imagePublicId, previousProject.imageResourceType || 'image');
        }

        return redirectWithMessage(res, '/admin#projects', uploadedImage ? 'Project updated with Cloudinary image.' : 'Project updated.');
    } catch (err) {
        if (uploadedImage?.publicId) {
            await deleteCloudinaryAsset(uploadedImage.publicId, uploadedImage.resourceType);
        }

        return redirectWithMessage(res, '/admin#projects', err.message || 'Could not update project.');
    }
});

app.post('/admin/projects/:id/delete', requireAdmin, async (req, res) => {
    try {
        await connectDB();
        const deletedProject = await Project.findByIdAndDelete(req.params.id).lean();
        await deleteCloudinaryAsset(deletedProject?.imagePublicId, deletedProject?.imageResourceType || 'image');
        return redirectWithMessage(res, '/admin#projects', 'Project deleted.');
    } catch (err) {
        return redirectWithMessage(res, '/admin#projects', 'Could not delete project.');
    }
});

app.post('/admin/certificates/import-defaults', requireAdmin, async (req, res) => {
    try {
        await connectDB();
        const count = await Certificate.countDocuments({});
        if (count > 0) {
            return redirectWithMessage(res, '/admin#certificates', 'Certificates already exist in the editor.');
        }

        await Certificate.insertMany(DEFAULT_CERTIFICATES.map((certificate) => ({
            ...certificate,
            fullImage: certificate.image,
            visible: true,
        })));
        return redirectWithMessage(res, '/admin#certificates', 'Default certificates imported for editing.');
    } catch (err) {
        return redirectWithMessage(res, '/admin#certificates', 'Could not import default certificates.');
    }
});

app.post('/admin/certificates', requireAdmin, async (req, res) => {
    let imageAsset = null;
    let fullImageAsset = null;

    try {
        await runUpload(certificateUpload, req, res);
        await connectDB();
        imageAsset = req.files?.certificateImage?.[0]
            ? await uploadToCloudinary(req.files.certificateImage[0], 'certificates')
            : null;
        fullImageAsset = req.files?.certificateFullImage?.[0]
            ? await uploadToCloudinary(req.files.certificateFullImage[0], 'certificates')
            : null;

        await Certificate.create(certificateFromBody(req.body, imageAsset, fullImageAsset));
        return redirectWithMessage(res, '/admin#certificates', imageAsset || fullImageAsset ? 'Certificate added with Cloudinary file.' : 'Certificate added.');
    } catch (err) {
        await deleteCloudinaryAsset(imageAsset?.publicId, imageAsset?.resourceType || 'image');
        await deleteCloudinaryAsset(fullImageAsset?.publicId, fullImageAsset?.resourceType || 'image');
        return redirectWithMessage(res, '/admin#certificates', err.message || 'Could not add certificate. Title and image are required.');
    }
});

app.post('/admin/certificates/:id', requireAdmin, async (req, res) => {
    let imageAsset = null;
    let fullImageAsset = null;

    try {
        await runUpload(certificateUpload, req, res);
        await connectDB();
        const previousCertificate = await Certificate.findById(req.params.id).lean();
        imageAsset = req.files?.certificateImage?.[0]
            ? await uploadToCloudinary(req.files.certificateImage[0], 'certificates')
            : null;
        fullImageAsset = req.files?.certificateFullImage?.[0]
            ? await uploadToCloudinary(req.files.certificateFullImage[0], 'certificates')
            : null;

        await Certificate.findByIdAndUpdate(req.params.id, certificateFromBody(req.body, imageAsset, fullImageAsset), { runValidators: true });

        if (imageAsset?.publicId && previousCertificate?.imagePublicId && previousCertificate.imagePublicId !== imageAsset.publicId) {
            await deleteCloudinaryAsset(previousCertificate.imagePublicId, previousCertificate.imageResourceType || 'image');
        }

        if (fullImageAsset?.publicId && previousCertificate?.fullImagePublicId && previousCertificate.fullImagePublicId !== fullImageAsset.publicId) {
            await deleteCloudinaryAsset(previousCertificate.fullImagePublicId, previousCertificate.fullImageResourceType || 'image');
        }

        return redirectWithMessage(res, '/admin#certificates', imageAsset || fullImageAsset ? 'Certificate updated with Cloudinary file.' : 'Certificate updated.');
    } catch (err) {
        await deleteCloudinaryAsset(imageAsset?.publicId, imageAsset?.resourceType || 'image');
        await deleteCloudinaryAsset(fullImageAsset?.publicId, fullImageAsset?.resourceType || 'image');
        return redirectWithMessage(res, '/admin#certificates', err.message || 'Could not update certificate.');
    }
});

app.post('/admin/certificates/:id/delete', requireAdmin, async (req, res) => {
    try {
        await connectDB();
        const deletedCertificate = await Certificate.findByIdAndDelete(req.params.id).lean();
        await deleteCloudinaryAsset(deletedCertificate?.imagePublicId, deletedCertificate?.imageResourceType || 'image');
        await deleteCloudinaryAsset(deletedCertificate?.fullImagePublicId, deletedCertificate?.fullImageResourceType || 'image');
        return redirectWithMessage(res, '/admin#certificates', 'Certificate deleted.');
    } catch (err) {
        return redirectWithMessage(res, '/admin#certificates', 'Could not delete certificate.');
    }
});

app.post('/admin/gallery', requireAdmin, async (req, res) => {
    let imageAsset = null;

    try {
        await runUpload(galleryImageUpload, req, res);
        await connectDB();
        imageAsset = req.file ? await uploadToCloudinary(req.file, 'gallery') : null;
        await GalleryImage.create(galleryFromBody(req.body, imageAsset));
        return redirectWithMessage(res, '/admin#gallery', imageAsset ? 'Gallery image uploaded to Cloudinary.' : 'Gallery image added.');
    } catch (err) {
        await deleteCloudinaryAsset(imageAsset?.publicId, imageAsset?.resourceType || 'image');
        return redirectWithMessage(res, '/admin#gallery', err.message || 'Could not add gallery image. Filename or upload is required.');
    }
});

app.post('/admin/gallery/:id', requireAdmin, async (req, res) => {
    let imageAsset = null;

    try {
        await runUpload(galleryImageUpload, req, res);
        await connectDB();
        const previousImage = await GalleryImage.findById(req.params.id).lean();
        imageAsset = req.file ? await uploadToCloudinary(req.file, 'gallery') : null;

        await GalleryImage.findByIdAndUpdate(
            req.params.id,
            galleryFromBody(req.body, imageAsset),
            { runValidators: true }
        );

        if (imageAsset?.publicId && previousImage?.imagePublicId && previousImage.imagePublicId !== imageAsset.publicId) {
            await deleteCloudinaryAsset(previousImage.imagePublicId, previousImage.imageResourceType || 'image');
        }

        return redirectWithMessage(res, '/admin#gallery', imageAsset ? 'Gallery image replaced with Cloudinary upload.' : 'Gallery image updated.');
    } catch (err) {
        await deleteCloudinaryAsset(imageAsset?.publicId, imageAsset?.resourceType || 'image');
        return redirectWithMessage(res, '/admin#gallery', err.message || 'Could not update gallery image.');
    }
});

app.post('/admin/gallery/:id/delete', requireAdmin, async (req, res) => {
    try {
        await connectDB();
        const deletedImage = await GalleryImage.findByIdAndDelete(req.params.id).lean();
        await deleteCloudinaryAsset(deletedImage?.imagePublicId, deletedImage?.imageResourceType || 'image');
        return redirectWithMessage(res, '/admin#gallery', 'Gallery image removed.');
    } catch (err) {
        return redirectWithMessage(res, '/admin#gallery', 'Could not remove gallery image.');
    }
});

app.get('/resume/file', async (req, res) => {
    try {
        const portfolioContent = await getSiteContent();
        const resumeUrl = normalizeText(portfolioContent.resumeUrl);

        if (!resumeUrl || (IS_PRODUCTION && isRuntimeLocalUploadUrl(resumeUrl))) {
            return res.redirect('/');
        }

        const fileName = getResumeFileName(portfolioContent, resumeUrl);

        if (isRuntimeLocalUploadUrl(resumeUrl)) {
            const filePath = getLocalUploadPath(resumeUrl);
            if (!filePath) return res.redirect('/');

            return res.sendFile(filePath, { headers: getInlinePdfHeaders(fileName) }, (error) => {
                if (error) {
                    console.log('Could not load local resume PDF:', error.message);
                    if (!res.headersSent) res.redirect('/');
                }
            });
        }

        if (!isHttpUrl(resumeUrl)) {
            return res.redirect(resumeUrl);
        }

        const response = await fetch(resumeUrl, {
            headers: { Accept: 'application/pdf,*/*' },
        });

        if (!response.ok) {
            throw new Error(`Resume PDF returned ${response.status}`);
        }

        const pdfBuffer = Buffer.from(await response.arrayBuffer());
        res.set(getInlinePdfHeaders(fileName));
        return res.send(pdfBuffer);
    } catch (error) {
        console.log('Could not stream resume PDF:', error.message);
        return res.redirect('/');
    }
});

app.get('/resume', async (req, res) => {
    try {
        const portfolioContent = await getSiteContent();
        const resumeUrl = normalizeText(portfolioContent.resumeUrl);

        if (!resumeUrl || (IS_PRODUCTION && isRuntimeLocalUploadUrl(resumeUrl))) {
            return res.redirect('/');
        }

        return res.render('resume.ejs', {
            resumeLabel: getResumeFileName(portfolioContent, resumeUrl),
        });
    } catch (error) {
        console.log('Could not load resume viewer:', error.message);
        return res.redirect('/');
    }
});

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
        const [files, leetcode, portfolioContent] = await Promise.all([
            fs.promises.readdir(imageDir),
            fetchLeetCodeStats(LEETCODE_USERNAME),
            getSiteContent(),
        ]);

        const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
        res.render('main/home.ejs', { images, leetcode, portfolioContent });
    } catch (error) {
        console.log("Error loading home page data:", error);
        res.send("Error in image loading");
    }
});

app.get("/certificate", async (req,res) => {
    try {
        const certificates = await getPublicCertificates();
        res.render('certificate.ejs', { certificates });
    } catch (err) {
        res.status(500).send('Error loading certificates');
    }
});

if (process.env.VERCEL !== '1') {
    app.listen(port,() => {
        console.log(`listening to port ${port}`);
        console.log(`http://localhost:${port}/`);
    });
}

module.exports = app;
