let jobsData = [];

const useJsonFile = true; // Set to false to use Google Apps Script data source

const filterState = {
    search: "",
    mode: "all",
    type: "all",
    location: "all"
};

function normalize(value) {
    if (!value) return '';
    return value.toLowerCase().trim().replace(/\s+/g, '-');
}

function isValid(value) {
    return value && value.trim() !== '';
}

async function loadCareers() {
    try {
        const dataUrl = useJsonFile
            ? 'careers.json'
            : 'https://script.google.com/macros/s/AKfycbz1M67rUOVyZiajZNRSpstarChU6pWy3P9rkxqmSFiug6yWJVl1EOuUVX4-fwuwS3sTrQ/exec';

        const response = await fetch(dataUrl);
        const rawData = await response.json();

        jobsData = rawData
            .filter(job => job.active === true)
            .map(job => ({
                ...job,
                modeNorm: normalize(job.mode),
                typeNorm: normalize(job.type),
                locationNorm: normalize(job.location)
            }));

        generateDynamicFilters(jobsData);
        displayJobs(jobsData);

                // Check if a specific job was requested via URL immediately after loading
                checkUrlForJob();

            "<p style='opacity:0.5; text-align:center;'>Check back soon for new opportunities.</p>";
    }
}

function handleFilters() {
    filterState.search = document.getElementById('jobSearch').value.toLowerCase();
    filterState.mode = document.getElementById('modeFilter').value;
    filterState.type = document.getElementById('typeFilter').value;
    filterState.location = document.getElementById('locationFilter').value;

    const filtered = jobsData.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(filterState.search);
        const matchesMode = filterState.mode === 'all' || job.modeNorm === filterState.mode;
        const matchesType = filterState.type === 'all' || job.typeNorm === filterState.type;
        const matchesLoc = filterState.location === 'all' || job.locationNorm === filterState.location;

        return matchesSearch && matchesMode && matchesType && matchesLoc;
    });

    displayJobs(filtered);
}

function generateDynamicFilters(data) {
    const buildOptions = (keyNorm, keyOriginal) => {
        const uniqueValues = new Map();
        data.forEach(job => {
            if (isValid(job[keyOriginal])) {
                uniqueValues.set(job[keyNorm], job[keyOriginal]);
            }
        });
        return uniqueValues;
    };

    const populateSelect = (id, optionsMap, label) => {
        const select = document.getElementById(id);
        let html = `<option value="all">ALL ${label}</option>`;
        optionsMap.forEach((original, norm) => {
            html += `<option value="${norm}">${original.toUpperCase()}</option>`;
        });
        select.innerHTML = html;
    };

    populateSelect('modeFilter', buildOptions('modeNorm', 'mode'), 'MODES');
    populateSelect('typeFilter', buildOptions('typeNorm', 'type'), 'TYPES');
    populateSelect('locationFilter', buildOptions('locationNorm', 'location'), 'LOCATIONS');
}

/* ---------------- DISPLAY JOBS ---------------- */
function displayJobs(jobs) {
    const container = document.getElementById('jobList');

    if (jobs.length === 0) {
        container.innerHTML = `
        <div style="text-align:center; padding: 60px; grid-column: 1/-1; border: 1px dashed #222;">
            <p style="opacity:0.4; font-family:'Syncopate'; font-size: 0.7rem; letter-spacing: 2px;">
                CHECK BACK SOON FOR NEW OPPORTUNITIES.
            </p>
        </div>`;
        return;
    }

    container.innerHTML = jobs.map(job => `
        <div class="job-card" onclick="openModal(${job.id})">
            <div style="width: 100%;">
                
                <div class="job-title" style="font-family:'Syncopate'; letter-spacing:2px; font-size:1.1rem; color:#fff;">
                    ${job.title}
                </div>

                <div class="job-meta">
                    <span class="job-tag tag-id">ID: ${job.id}</span>
                    ${isValid(job.mode) ? `<span class="job-tag tag-important">${job.mode}</span>` : ''}
                    ${isValid(job.type) ? `<span class="job-tag">${job.type}</span>` : ''}
                    ${job.modeNorm !== 'remote' && isValid(job.location) ? `<span class="job-tag" style="opacity:0.5;">${job.location}</span>` : ''}
                </div>
                
            </div>
            <div style="font-size: 1.2rem; opacity: 0.3; color:#fff;">→</div>
        </div>
    `).join('');
}

/* ---------------- MODAL ---------------- */
function openModal(jobId) {
    const job = jobsData.find(j => j.id === jobId);
    if (!job) return;

    const content = document.getElementById('modalContent');

    const renderList = (title, items) => {
        if (!items || items.length === 0) return '';
        return `
            <strong> ${title}</strong>
            <p>${items.map(item => `• ${item}`).join('<br>')}</p>
        `;
    };

    content.innerHTML = `
        <div style="margin-bottom:25px; display: flex; gap: 10px; flex-wrap: wrap;">
            <span class="job-tag tag-id" style="margin-bottom:0;">ID: ${job.id}</span>
            ${isValid(job.mode) ? `<span class="job-tag tag-important">${job.mode}</span>` : ''}
            ${isValid(job.type) ? `<span class="job-tag">${job.type}</span>` : ''}
        </div>

        <h2 style="font-family:'Syncopate'; font-size:1.6rem; margin-bottom:25px; border-bottom:1px solid #222; padding-bottom:20px; color:#fff;">
            ${job.title.toUpperCase()}
        </h2>

        <div class="modal-body">
            <p>${job.description}</p>

            ${renderList('REQUIREMENTS', job.requirements)}
            ${renderList('EXPECTATIONS', job.expectations)}
            ${renderList('PROJECTS', job.workOn)}
            ${renderList('GROWTH PATH', job.growthPath)}

            <div style="display: flex; align-items: center; gap: 15px; margin-top: 40px; flex-wrap: wrap;">
                <a href="${job.applyUrl}" target="_blank" class="apply-now" onclick="handleApply(event, '${job.applyUrl}')"
                    style="padding:18px 45px; background:#fff; color:#000; text-decoration:none; font-family:'Syncopate'; font-size:0.7rem; font-weight:700; letter-spacing:3px; transition: opacity 0.3s;">
                    APPLY FOR POSITION
                </a>
                
                <button onclick="shareJob('${job.id}')" title="Share this job"
                    style="background: transparent; border: 1px solid rgba(255,255,255,0.2); padding: 13px 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s;"
                    onmouseover="this.style.borderColor='#d4af37'; this.style.backgroundColor='rgba(255,255,255,0.05)'"
                    onmouseout="this.style.borderColor='rgba(255,255,255,0.2)'; this.style.backgroundColor='transparent'">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="#fff" viewBox="0 0 24 24">
                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    document.getElementById('jobModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('jobModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

window.onclick = function (event) {
    const modal = document.getElementById('jobModal');
    if (event.target == modal) closeModal();
}

// --- NEW FEATURES LOGIC ---

function showNotification(message) {
    const notif = document.getElementById('globalNotification');
    document.getElementById('notificationMsg').innerHTML = message;
    notif.style.display = 'flex';
}

function closeNotification() {
    document.getElementById('globalNotification').style.display = 'none';
}

function handleApply(event, url) {
    if (!url || url === 'undefined' || url.trim() === '' || (!url.startsWith('http') && !url.includes('forms'))) {
        event.preventDefault();
        showNotification("There was an error at our side. We are trying to fix it soon, please be patient.<br><br>For any issues, please <a href='index.html#contact'>contact us</a>.");
    }
}

async function shareJob(id) {
    const urlToShare = window.location.origin + window.location.pathname + '?jobId=' + id;

    try {
        // First copy the link to clipboard
        await navigator.clipboard.writeText(urlToShare);

        // Then try to show native share options based on device
        if (navigator.share) {
            await navigator.share({
                title: 'EvoRES Careers',
                text: 'Check out this job opening at EvoRES Technology LLP!',
                url: urlToShare
            });
        } else {
            showNotification("Job link copied to clipboard successfully!");
        }
    } catch (error) {
        console.error("Error sharing link:", error);
        // Fallback message if clipboard/share API fails
        showNotification("Job link copied to clipboard successfully!");
    }
}

function checkUrlForJob() {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('jobId');

    if (jobId) {
        // jobsData only contains active=true jobs based on loadCareers filtering
        const job = jobsData.find(j => j.id.toString() === jobId);

        if (job) {
            openModal(job.id);
        } else {
            showNotification("This job was closed or could not be found. Please check the website for other available jobs.");
        }

        // Optional: Clean URL so the check doesn't fire continuously on manual refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

document.getElementById('jobSearch').addEventListener('input', handleFilters);
document.getElementById('modeFilter').addEventListener('change', handleFilters);
document.getElementById('typeFilter').addEventListener('change', handleFilters);
document.getElementById('locationFilter').addEventListener('change', handleFilters);

loadCareers();