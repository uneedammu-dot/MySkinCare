/* ==========================================================================
   VIEW NAVIGATION & AUTH HANDLER
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        showView('view-app');
        updateUserDisplay();
    } else {
        showView('view-landing');
    }
});

function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function handleLogin(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('username').value.trim();
    const displayName = usernameInput || 'User';
    
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userDisplayName', displayName);
    
    updateUserDisplay();
    showView('view-app');
}

function handleLoginDirect() {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userDisplayName', 'New User');
    updateUserDisplay();
    showView('view-app');
}

function updateUserDisplay() {
    const nameDisplay = document.getElementById('user-name-display');
    if (nameDisplay) {
        nameDisplay.innerText = localStorage.getItem('userDisplayName') || 'User';
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userDisplayName');
    showView('view-login');
}

/* ==========================================================================
   GLOBAL STATE & INITIALIZATION
   ========================================================================== */
let uploadedImageData = null;
let isScanned = false;
let faceMeshModel = null;
let currentDetectedSkinType = null;

function initFaceMesh() {
    if (!faceMeshModel && window.FaceMesh) {
        faceMeshModel = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        faceMeshModel.setOptions({
            maxNumFaces: 1,
            refineLandmarks: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
    }
}

function detectHumanFace(element) {
    return new Promise((resolve) => {
        initFaceMesh();
        if (!faceMeshModel) {
            resolve(false);
            return;
        }

        let faceDetected = false;
        faceMeshModel.onResults((results) => {
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                faceDetected = true;
            }
            resolve(faceDetected);
        });

        faceMeshModel.send({ image: element }).catch(() => resolve(false));
    });
}

/* ==========================================================================
   PAGE & TAB NAVIGATION CONTROLLER
   ========================================================================== */
function goToPage(pageId) {
    document.querySelectorAll('.page-step').forEach(page => {
        page.style.display = 'none';
        page.classList.remove('active');
    });

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        targetPage.classList.add('active');
        targetPage.scrollIntoView({ behavior: 'smooth' });
    }
}

function switchTab(modeId, evt) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const selectedTab = document.getElementById(modeId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active');
    }
    
    const activeBtn = evt ? evt.currentTarget : (modeId === 'scan-mode' ? document.getElementById('tab-scan') : document.getElementById('tab-direct'));
    if (activeBtn) activeBtn.classList.add('active');

    const resultsContainer = document.getElementById('results-container');
    if (resultsContainer) resultsContainer.style.display = 'none';
}

/* ==========================================================================
   FACIAL SCANNING & UPLOAD LOGIC
   ========================================================================== */
async function startFaceScan() {
    const video = document.getElementById('webcam');
    const preview = document.getElementById('scanned-preview');
    const box = document.getElementById('scanner-box');
    const status = document.getElementById('scan-status');
    
    if (preview) preview.style.display = 'none';
    if (box) box.classList.remove('scan-error');
    isScanned = false;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (video) {
            video.srcObject = stream;
            video.style.display = 'block';
        }
        if (box) box.classList.add('scanning');
        if (status) {
            status.innerText = "Analyzing video stream...";
            status.style.color = "#2e7d32";
        }

        setTimeout(async () => {
            const isFacePresent = video ? await detectHumanFace(video) : false;

            const canvas = document.createElement('canvas');
            canvas.width = video ? (video.videoWidth || 250) : 250;
            canvas.height = video ? (video.videoHeight || 250) : 250;
            const ctx = canvas.getContext('2d');
            if (video) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            stream.getTracks().forEach(track => track.stop());
            if (video) video.style.display = 'none';
            if (box) box.classList.remove('scanning');

            if (!isFacePresent) {
                isScanned = false;
                if (status) {
                    status.innerText = "❌ No face detected! Please position a human face in frame.";
                    status.style.color = "red";
                }
                if (box) box.classList.add('scan-error');
            } else {
                isScanned = true;
                uploadedImageData = canvas.toDataURL('image/png');
                if (preview) {
                    preview.src = uploadedImageData;
                    preview.style.display = 'block';
                }
                if (status) {
                    status.innerText = "Scan successfully completed!";
                    status.style.color = "#2e7d32";
                }
            }
        }, 2500);

    } catch (error) {
        alert("Camera permission denied or camera unavailable. Please upload an image.");
        if (status) {
            status.innerText = "Webcam unavailable!";
            status.style.color = "red";
        }
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    const box = document.getElementById('scanner-box');
    if (box) box.classList.remove('scan-error');
    isScanned = false;
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImageData = e.target.result;
            const preview = document.getElementById('scanned-preview');
            if (preview) {
                preview.src = uploadedImageData;
                preview.style.display = 'block';
            }
            const webcam = document.getElementById('webcam');
            if (webcam) webcam.style.display = 'none';
            
            const scanBtn = document.getElementById('scan-upload-btn');
            if (scanBtn) scanBtn.style.display = 'inline-block';
            
            const status = document.getElementById('scan-status');
            if (status) {
                status.innerText = "Image uploaded. Click 'Scan Uploaded Image'";
                status.style.color = "#2e7d32";
            }
        };
        reader.readAsDataURL(file);
    }
}

async function scanUploadedImage() {
    if (!uploadedImageData) return;
    
    const box = document.getElementById('scanner-box');
    const status = document.getElementById('scan-status');
    const preview = document.getElementById('scanned-preview');
    
    if (box) {
        box.classList.remove('scan-error');
        box.classList.add('scanning');
    }
    if (status) {
        status.innerText = "Scanning uploaded image...";
        status.style.color = "#2e7d32";
    }
    
    setTimeout(async () => {
        if (box) box.classList.remove('scanning');
        
        const isFacePresent = preview ? await detectHumanFace(preview) : false;
        
        if (!isFacePresent) {
            isScanned = false;
            if (status) {
                status.innerText = "❌ No human face detected in image! Please upload a clear face photo.";
                status.style.color = "red";
            }
            if (box) box.classList.add('scan-error');
        } else {
            isScanned = true;
            if (status) {
                status.innerText = "Scan successfully completed!";
                status.style.color = "#2e7d32";
            }
            const scanBtn = document.getElementById('scan-upload-btn');
            if (scanBtn) scanBtn.style.display = 'none';
        }
    }, 1500);
}

/* ==========================================================================
   QUIZ SUBMISSION & MULTI-PAGE FLOW
   ========================================================================== */
function submitQuiz(event) {
    event.preventDefault();

    if (!isScanned || !uploadedImageData) {
        alert("⚠️ Please upload/scan a clear face image before proceeding!");
        const status = document.getElementById('scan-status');
        if (status) {
            status.innerText = "Error: Face scan completion required!";
            status.style.color = "red";
        }
        const scanMode = document.getElementById('scan-mode') || document.getElementById('scanner-box');
        if (scanMode) scanMode.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const formData = new FormData(event.target);
    const answers = [];
    for (let value of formData.values()) {
        if (value) answers.push(value);
    }

    if (answers.length === 0) {
        alert("Please answer the questionnaire choices!");
        return;
    }

    const counts = {};
    answers.forEach(skin => counts[skin] = (counts[skin] || 0) + 1);
    currentDetectedSkinType = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);

    if (currentDetectedSkinType && database[currentDetectedSkinType]) {
        renderSkinDetectionPage(currentDetectedSkinType);
        displayResults(currentDetectedSkinType, 'recommendations-output', 'result-title');
        
        const pageDetection = document.getElementById('page-detection');
        if (pageDetection) {
            goToPage('page-detection');
        } else {
            const resultsContainer = document.getElementById('results-container');
            if (resultsContainer) {
                resultsContainer.style.display = 'block';
                resultsContainer.scrollIntoView({ behavior: 'smooth' });
            }
        }
    } else {
        alert("Unable to calculate skin type. Please review your answers.");
    }
}

function renderSkinDetectionPage(skinType) {
    const data = database[skinType];
    const badge = document.getElementById('detection-badge');
    const title = document.getElementById('detected-type-title');
    const desc = document.getElementById('detected-type-desc');

    if (badge) badge.innerText = skinType.toUpperCase();
    if (title) title.innerText = data.title;
    if (desc) desc.innerText = data.description;
}

function resetQuiz() {
    const quizForm = document.getElementById('quiz-form');
    if (quizForm) quizForm.reset();
    
    isScanned = false;
    uploadedImageData = null;
    currentDetectedSkinType = null;

    const preview = document.getElementById('scanned-preview');
    if (preview) preview.style.display = 'none';
    
    const status = document.getElementById('scan-status');
    if (status) {
        status.innerText = "Position your face within the frame";
        status.style.color = "#333";
    }
    
    goToPage('page-quiz');
}

/* ==========================================================================
   DIRECT MODE SELECTION HANDLERS
   ========================================================================== */
function loadDirectRecommendations(skinType) {
    displayResults(skinType, 'direct-recommendations-output', 'direct-result-title');
    const container = document.getElementById('direct-results-container');
    if (container) {
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth' });
    }
}

/* ==========================================================================
   SKINCARE DATABASE
   ========================================================================== */
const database = {
    oily: {
    title: "Oily Skin Type 💧",
    description: "Your skin exhibits excess sebum production, enlarged pores, and a shiny appearance, making it prone to breakouts.",
    categories: {
        "Ayurvedic": [
            {
                name: "Neem & Tea Tree Face Cleanser",
                image:"https://i.postimg.cc/W3dKtXLg/nto.jpg",
                time: "Morning & Night",
                use1: "Reduces excess sebum production &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", 
                use2: "Prevents bacterial acne breakouts"
            },
            {
                name: "Sandalwood & Rosewater Pack",
                image:"https://i.postimg.cc/zG3TsMny/swro.jpg",
                time: "Twice a week (Evening)",
                use1: "Soothes inflammation &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                use2: "Tightens open pores"
            },
            {
                name: "Aloe Vera & Cucumber Gel",
                image: "https://i.postimg.cc/qRmJHmct/acgo.jpg",
                time: "Every morning after cleansing",
                use1: "Provides oil-free lightweight hydration &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                use2: "Calms redness"
            }
        ],

        "Cosmetics": [
            {
                name: "Salicylic Acid 2% Exfoliating Cleanser",
                image:"https://i.postimg.cc/t4hVGjsd/saeco.jpg",
                time: "Daily Night",
                use1: "Clears out clogged pores &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                use2: "Reduces blackheads and whiteheads"
            },
            {
                name: "Niacinamide 10% Serum",
                image: "https://i.postimg.cc/P5zNFQ71/nso.jpg",
                time: "Twice daily",
                use1: "Regulates sebum excretion &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                use2: "Fades acne blemish marks"
            },
            {
                name: "Oil-Free Gel Moisturizer",
                image: "https://i.postimg.cc/W4YgbPvT/ogmo.jpg",
                time: "Morning & Night",
                use1: "Locks in water without greasy residue &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                use2: "Strengthens skin barrier"
            }
        ],

        "Home Remedies": [
            {
                name: "Multani Mitti & Lemon Mask",
                image:"https://i.postimg.cc/V61hWMTs/mmlmo.jpg",
                time: "Once a week",
                use1: "Absorbs deep-seated excess oil &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                use2: "Brightens dull skin tone"
            },
            {
                name: "Raw Tomato Juice Toner",
                image: "https://i.postimg.cc/j21vmJ8n/tco.jpg",
                time: "Night before bed",
                use1: "Natural astringent properties tighten pores &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                use2: "Balances skin pH level"
            },
            {
                name: "Chia Seed Face Mask",
                image: "https://i.postimg.cc/KjTJX8Cf/csfmo.jpg",
                time: "Twice a week",
                use1: "Rich in omega-3 fatty acids to calm inflammation &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                use2: "Hydrates without adding oil"
            }
        ]
    }
},
    dry: {
        title: "Dry Skin Type 🌵",
        description: "Your skin barrier lacks essential lipids, leading to tightness, flaking, fine lines, and dullness.",
        categories: {
            "Ayurvedic": [
                { name: "Kumkumadi Tailam (Saffron Face Oil)", 
                  image: "https://i.postimg.cc/HkZ9jM08/ktd.jpg", 
                  time: "Night before sleep",
                  use1: "Deeply nourishes dry flaky patches &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Imparts natural radiant glow" },
                { name: "Almond & Honey Nourishing Cleanser",
                  image :"https://i.postimg.cc/hvZtVK2K/ahncd.jpg", 
                  time: "Morning & Night", 
                  use1: "Cleanses without stripping natural oils &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                  use2: "Softens texture" },
                { name: "Aloe Vera & Rosewater Hydrating Mist",
                  image:"https://i.postimg.cc/L5TXyzv3/avrgo.jpg",
                  time: "As needed throughout the day",
                  use1: "Instantly refreshes parched skin &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Locks in moisture" }
            ],
            "Cosmetics": [
                { name: "Hydrating Cream Cleanser with Ceramides", 
                  image:"https://i.postimg.cc/dtFbjbb0/hccd.jpg ", 
                  time: "Morning & Night", use1: "Repairs broken lipid barriers &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Retains essential moisture" },
                { name: "Hyaluronic Acid 2% + B5 Serum", 
                  image:"https://i.postimg.cc/L6vbBnkG/ha2d.jpg",
                  time: "Applied on damp skin twice daily", use1: "Draws water deep into skin layers &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Plumps up dehydrated fine lines" },
                { name: "Rich Emollient Night Cream",
                  image: "https://i.postimg.cc/nzk4bQhk/jd.jpg",
                  time: "Night before sleep", use1: "Locks in hydration overnight &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Prevents morning tightness" }
            ],
            "Home Remedies": [
                { name: "Ripe Banana & Honey Mask",
                  image:"https://i.postimg.cc/YqmvQWwB/rbhmd.jpg", 
                  time: "Twice a week", use1: "Rich in potassium to hydrate flaky skin &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Softens rough patches" },
                { name: "Oatmeal & Yogurt Soothing Pack",
                  image: "https://i.postimg.cc/3wbygCWk/oyspd.jpg",
                  time: "Once a week", use1: "Gentle exfoliation without irritation &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Locks in moisture" },
                { name: "Coconut Oil Overnight Treatment", 
                  image: " https://i.postimg.cc/TYCTL2pH/cod.jpg",
                  time: "Night before sleep", use1: "Deeply nourishes dry areas &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Restores skin elasticity" }
            ]
        }
    },
    combination: {
        title: "Combination Skin Type ⚖️",
        description: "Your skin features an oily T-zone (forehead, nose, chin) alongside normal or dry cheek areas.",
        categories: {
            "Ayurvedic": [
                { name: "Neem & Tulsi Balanced Face Wash",
                  image:"https://i.postimg.cc/BnqDGBzR/ntbfwc.jpg",
                  time:"Morning & Night", use1: "Cleanses oily T-zone safely &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Protects dry cheeks from irritation" },
                { name: "Saffron & Aloe Vera Hydrating Pack", 
                  image: "https://i.postimg.cc/mZzydVxh/avsc.jpg",
                  time: "Twice a week", use1: "Balances oiliness and dryness &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Brightens uneven skin tone"}, 
                { name: "Cucumber & Rosewater Mist",
                  image: "https://i.postimg.cc/QN1W9zGz/crwc.jpg", 
                  time: "As needed throughout the day", use1: "Refreshes oily areas without over-drying &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Hydrates dry patches" }
                
            ],
            "Cosmetics": [
                { name: "Gentle Foaming Amino Acid Cleanser", 
                  image: "https://i.postimg.cc/QttPH7n4/gfaacc.jpg", 
                  time: "Morning & Night", use1: "Cleanses gently without over-drying &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Maintains skin barrier" },
                { name: "Niacinamide + Hyaluronic Acid Complex Serum", 
                  image: "https://i.postimg.cc/kgv57rSc/nhacsc.jpg",
                  time: "Twice daily", use1: "Controls T-zone oil while hydrating cheeks &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Smooths uneven texture" },
                { name: "Lightweight Gel-Cream Moisturizer", 
                  image: "https://i.postimg.cc/QMtGWvFJ/lwgcmc.jpg",
                  time: "Morning & Night", use1: "Hydrates dry areas without greasiness &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Balances overall skin moisture" }
            ],
            "Home Remedies": [
                { name: "Yogurt & Honey Balancing Pack", 
                  image: "https://i.postimg.cc/prM6kSdn/yhbpc.jpg", 
                  time: "Twice a week", use1: "Lactic acid mildly exfoliates T-zone &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Honey nourishes dry cheeks" },
                { name: "Green Tea & Aloe Vera Toner", 
                  image: "https://i.postimg.cc/7L2Rr4dL/gtavtc.jpg",
                  time: "Night before bed", use1: "Controls excess oil in T-zone &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Soothes and hydrates dry areas" },
                { name: "Oatmeal & Rosewater Face Mask",
                  image: "https://i.postimg.cc/C11VvZMY/IMG-20260921-WA0027.jpg", 
                  time: "Once a week", use1: "Balances oil and moisture levels &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Reduces redness and irritation" }
            ]
        }
    },
    normal: {
        title: "Normal Skin Type ✨",
        description: "Your skin is well-balanced with minimal blemishes, even texture, and controlled moisture levels.",
        categories: {
            "Ayurvedic": [
                { name: "Chandana (Sandalwood) Face Cleanser", 
                  image: "https://i.postimg.cc/tTjcNfTM/cfcn.jpg",
                  time: "Morning & Night", use1: "Maintains natural skin radiance &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Prevents minor blemishes" },
                { name: "Aloe Vera & Saffron Hydrating Pack",
                  image: "https://i.postimg.cc/L5hphdKL/Screenshot-20260921-190319.png",
                  time: "Twice a week", use1: "Enhances natural glow &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Keeps skin soft and supple" },
                { name: "Rosewater & Cucumber Mist" ,
                  image: "https://i.postimg.cc/QN1W9zGz/crwc.jpg",
                  time: "As needed throughout the day", use1: "Refreshes skin without overhydration &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Maintains balanced moisture" }
            ],
            "Cosmetics": [
                { name: "Gentle Daily Hydrating Cleanser", 
                  image: "https://i.postimg.cc/Z5zDS2PB/gdhcn.jpg", 
                  time: "Morning & Night", use1: "Preserves natural skin balance &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Removes impurities smoothly" },
                { name: "Vitamin C Radiance Serum", 
                  image: "https://i.postimg.cc/W1hWfMgY/IMG-20260921-WA0028.jpg", 
                  time: "Every morning", use1: "Protects against environmental pollution &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Boosts natural skin glow" },
                { name: "Lightweight Daily Moisturizer",
                  image: "https://i.postimg.cc/jS0wGTJ1/Screenshot-20260921-210835.png",
                  time: "Morning & Night", use1: "Locks in hydration without heaviness &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Maintains skin elasticity" }
            ],
            "Home Remedies": [
                { name: "Besan (Gram Flour) & Turmeric Ubtan",
                  image: "https://i.postimg.cc/W4pMHVBc/Screenshot-20260919-203313.png", 
                  time: "Once a week", use1: "Gentle natural exfoliation &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Brings out natural glow" },
                { name: "Coconut Water & Aloe Vera Toner", 
                  image: "https://i.postimg.cc/hGhXmGFJ/IMG-20260919-WA0044.jpg",
                  time: "Night before bed", use1: "Maintains skin hydration balance &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Soothes minor irritations" },
                { name: "Honey & Milk Face Pack",
                  image: "https://i.postimg.cc/Dzb2F4kq/Screenshot-20260919-203402.png", 
                  time: "Twice a week", use1: "Nourishes skin with natural nutrients &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Keeps skin soft and radiant" }
            ]
        }
    },
    sensitive: {
        title: "Sensitive Skin Type 🌸",
        description: "Your skin reacts easily to environmental changes and harsh ingredients, manifesting in redness, burning, or itching.",
        categories: {
            "Ayurvedic": [
                { name: "Neem & Chandana Soothing Wash",
                  image:"https://i.postimg.cc/PqZk0GYQ/Screenshot-20260919-203930.png", 
                  time: "Morning & Night", use1: "Extremely gentle on reactive skin &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Reduces sudden skin redness" },
                { name: "Aloe Vera & Cucumber Calming Pack", 
                 image: "https://i.postimg.cc/kGWsdcfJ/Screenshot-20260921-212539.png", 
                 time: "Twice a week", use1: "Instantly cools inflamed areas &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Strengthens skin barrier" },
                { name: "Rosewater & Chamomile Mist", 
                 image: "https://i.postimg.cc/rwZS33Mf/IMG-20260919-WA0045.jpg", 
                 time: "As needed throughout the day", use1: "Soothes irritation and redness &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Provides light hydration" }
            ],
            "Cosmetics": [
                { name: "Fragrance-Free Barrier Repair Cleanser",
                  image: "https://i.postimg.cc/SsFzpp5z/IMG-20260919-WA0025.jpg", 
                  time: "Morning & Night", use1: "Cleanses without stinging or burning &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Fortifies weak skin barrier" },
                { name: "Centella Asiatica (Cica) Calming Serum", 
                  image: "https://i.postimg.cc/jdmx14BR/IMG-20260919-WA0030.jpg",
                  time: "Twice daily", use1: "Instantly calms red, irritated patches &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Accelerates skin healing" },
                { name: "Hypoallergenic Moisturizing Cream", 
                  image: "https://i.postimg.cc/GhGLZyRz/Screenshot-20260921-213815.png", 
                  time: "Morning & Night", use1: "Locks in moisture without clogging pores &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Reduces sensitivity over time" }
            ],
            "Home Remedies": [
                { name: "Chilled Whole Milk Compress", 
                 image: "https://i.postimg.cc/wT8HcjNR/IMG-20260919-WA0048.jpg", 
                 time: "As needed for flare-ups", use1: "Lactic acid and fats soothe irritation &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Reduces skin heat and redness" },
                { name: "Oatmeal & Honey Gentle Mask", 
                 image: "https://i.postimg.cc/nL5NF3YR/Screenshot-20260919-204328.png",
                 time: "Once a week", use1: "Anti-inflammatory properties calm skin &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Provides light hydration" },
                { name: "Aloe Vera Gel & Rosewater Pack",
                  image: "https://i.postimg.cc/65Yj6HB4/IMG-20260919-WA0050.jpg", 
                  time: "Twice a week", use1: "Soothes and cools sensitive areas &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", use2: "Strengthens skin barrier" }
            ]
        }
    }
};

/* ==========================================================================
   RESULTS RENDERER
   ========================================================================== */
function displayResults(skinType, outputId = 'recommendations-output', titleId = 'result-title') {
    const data = database[skinType];
    const resultTitle = document.getElementById(titleId);
    const output = document.getElementById(outputId);

    if (!data || !resultTitle || !output) return;

    resultTitle.innerText = "Recommendations for " + data.title;
    output.innerHTML = "";

    for (const [categoryName, products] of Object.entries(data.categories)) {
        const catDiv = document.createElement('div');
        catDiv.className = 'category-section';
        
        let categoryHTML = `<h3>${categoryName} Solutions</h3>`;
        products.forEach(prod => {
            categoryHTML += `
                <div class="product-item">
                    <img src="${prod.image}" alt="${prod.name}" class="product-img" onerror="this.src='https://via.placeholder.com/80?text=Product';">
                    <div class="product-info">
                        <strong>${prod.name}</strong>
                        <small>⏰ <b>Time to use:</b> ${prod.time}</small>
                        <small>✨ <b>Uses:</b> 1. ${prod.use1} | 2. ${prod.use2}</small>
                    </div>
                </div>
            `;
        });

        catDiv.innerHTML = categoryHTML;
        output.appendChild(catDiv);
    }
}
function scrollToSkinCards() {
    const directMode = document.getElementById("direct-mode");

    if (directMode) {
        directMode.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}