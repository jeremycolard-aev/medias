/**
 * Aix en Vue - Video & Photo Storage App Frontend Logic
 */

// State Management
let APPS_SCRIPT_URL = localStorage.getItem('AEV_APPS_SCRIPT_URL') || 'https://script.google.com/macros/s/AKfycbypso6iJY_7I2ZFTKEx0mFCG-9boYOWTiYW7z6X69uZkaLf_-tvcntYfi_5ORnhCIpyzA/exec';
let mediaList = [];
let uploadQueue = [];
let deferredPrompt = null; // PWA installation prompt

// DOM Elements
const apiConfigBanner = document.getElementById('api-config-banner');
const apiUrlInput = document.getElementById('api-url-input');
const saveApiUrlBtn = document.getElementById('save-api-url-btn');
const connectionStatus = document.getElementById('connection-status');
const dropzone = document.getElementById('dropzone');
const filePicker = document.getElementById('file-picker');
const uploadQueueSection = document.getElementById('upload-queue-section');
const uploadQueueGrid = document.getElementById('upload-queue-grid');
const galleryGrid = document.getElementById('gallery-grid');
const gallerySkeleton = document.getElementById('gallery-skeleton');
const galleryEmpty = document.getElementById('gallery-empty');
const refreshGalleryBtn = document.getElementById('refresh-gallery-btn');
const editSettingsBtn = document.getElementById('edit-settings-btn');

// Modal Elements
const mediaModal = document.getElementById('media-modal');
const modalMediaContainer = document.getElementById('modal-media-container');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setupEventListeners();
  setupPwa(); // Register Service Worker and PWA installer
  
  if (!APPS_SCRIPT_URL) {
    showApiConfig(true);
  } else {
    showApiConfig(false);
    loadGallery();
  }
}

// PWA Management
function setupPwa() {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registered:', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }

  // Handle Before Install Prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent standard browser prompt
    e.preventDefault();
    // Save event for later use
    deferredPrompt = e;
    
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('AEV_PWA_DISMISSED') === 'true';
    if (!isDismissed) {
      const pwaInstallBanner = document.getElementById('pwa-install-banner');
      if (pwaInstallBanner) {
        pwaInstallBanner.style.display = 'flex';
      }
    }
  });
}

// Event Listeners
function setupEventListeners() {
  // Config Events
  saveApiUrlBtn.addEventListener('click', handleSaveConfig);
  editSettingsBtn.addEventListener('click', () => showApiConfig(true));
  
  // Refresh Button
  refreshGalleryBtn.addEventListener('click', loadGallery);
  
  // Drag and Drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  });
  
  // File Picker
  filePicker.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
  });
  
  // Modal Close
  modalClose.addEventListener('click', closeModal);
  mediaModal.addEventListener('click', (e) => {
    if (e.target === mediaModal) closeModal();
  });
  
  // Keyboard Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mediaModal.open) {
      closeModal();
    }
  });

  // PWA Install Action Listeners
  const pwaInstallBanner = document.getElementById('pwa-install-banner');
  const pwaInstallBtn = document.getElementById('pwa-install-btn');
  const pwaDismissBtn = document.getElementById('pwa-dismiss-btn');

  if (pwaInstallBtn && pwaDismissBtn && pwaInstallBanner) {
    pwaInstallBtn.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the PWA install prompt');
          } else {
            console.log('User dismissed the PWA install prompt');
          }
          deferredPrompt = null;
          pwaInstallBanner.style.display = 'none';
        });
      }
    });

    pwaDismissBtn.addEventListener('click', () => {
      sessionStorage.setItem('AEV_PWA_DISMISSED', 'true');
      pwaInstallBanner.style.display = 'none';
    });
  }
}

// API Configuration Management
function showApiConfig(show) {
  if (show) {
    apiConfigBanner.style.display = 'block';
    apiUrlInput.value = APPS_SCRIPT_URL === 'demo' ? '' : APPS_SCRIPT_URL;
  } else {
    apiConfigBanner.style.display = 'none';
  }
}

function handleSaveConfig() {
  let url = apiUrlInput.value.trim();
  
  if (!url) {
    // If empty input, check if they typed "demo" or activate Demo Mode
    alert("Veuillez entrer une URL Apps Script valide, ou tapez 'demo' pour tester l'interface en mode démonstration.");
    return;
  }
  
  if (url.toLowerCase() === 'demo') {
    url = 'demo';
    initDemoData();
  } else if (!url.startsWith('https://script.google.com/')) {
    alert("L'URL doit commencer par https://script.google.com/. S'il s'agit d'une démonstration, entrez simplement 'demo'.");
    return;
  }
  
  APPS_SCRIPT_URL = url;
  localStorage.setItem('AEV_APPS_SCRIPT_URL', url);
  showApiConfig(false);
  loadGallery();
}

// Demo Mode Data Initialization
function initDemoData() {
  if (!sessionStorage.getItem('AEV_DEMO_MEDIAS')) {
    const demoMedias = [
      {
        id: 'demo-img-1',
        name: 'Plage du Midi.jpg',
        mimeType: 'image/jpeg',
        created: Date.now() - 3600000 * 2, // 2 hours ago
        size: 2450000,
        webViewLink: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        thumbnailLink: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=150&h=150&q=80'
      },
      {
        id: 'demo-vid-1',
        name: 'Vagues sur les Rochers.mp4',
        mimeType: 'video/mp4',
        created: Date.now() - 3600000 * 24, // 1 day ago
        size: 15400000,
        webViewLink: 'https://www.w3schools.com/html/mov_bbb.mp4',
        thumbnailLink: null
      },
      {
        id: 'demo-img-2',
        name: 'Randonnée Montagne.jpg',
        mimeType: 'image/png',
        created: Date.now() - 3600000 * 48, // 2 days ago
        size: 4200000,
        webViewLink: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
        thumbnailLink: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=150&h=150&q=80'
      }
    ];
    sessionStorage.setItem('AEV_DEMO_MEDIAS', JSON.stringify(demoMedias));
  }
}

// Load Gallery Data
async function loadGallery() {
  galleryGrid.style.display = 'none';
  galleryEmpty.style.display = 'none';
  gallerySkeleton.style.display = 'grid';
  connectionStatus.style.display = 'none';
  
  if (!APPS_SCRIPT_URL) {
    gallerySkeleton.style.display = 'none';
    showApiConfig(true);
    return;
  }
  
  try {
    if (APPS_SCRIPT_URL === 'demo') {
      // Simulate API lag
      await new Promise(resolve => setTimeout(resolve, 800));
      const demoMedias = JSON.parse(sessionStorage.getItem('AEV_DEMO_MEDIAS') || '[]');
      renderGallery(demoMedias);
      return;
    }
    
    // Normal Apps Script mode
    connectionStatus.style.display = 'block';
    
    const response = await fetch(`${APPS_SCRIPT_URL}?action=list`, {
      method: 'GET',
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    connectionStatus.style.display = 'none';
    
    if (data.success) {
      renderGallery(data.files);
    } else {
      throw new Error(data.error || "Erreur inconnue");
    }
  } catch (err) {
    console.error("Gallery Load Error:", err);
    connectionStatus.style.display = 'none';
    gallerySkeleton.style.display = 'none';
    
    // Display error message
    alert(`Impossible de se connecter à la Web App Apps Script.\nErreur : ${err.message}\n\nVérifiez que l'URL est correcte, que la Web App est déployée pour 'Anyone' (Tout le monde), et que vous avez autorisé le script.`);
    
    // Show configuration panel
    showApiConfig(true);
    galleryEmpty.style.display = 'block';
  }
}

// Render Gallery
function renderGallery(files) {
  gallerySkeleton.style.display = 'none';
  galleryGrid.innerHTML = '';
  mediaList = files;
  
  if (!files || files.length === 0) {
    galleryEmpty.style.display = 'block';
    galleryGrid.style.display = 'none';
    return;
  }
  
  galleryEmpty.style.display = 'none';
  galleryGrid.style.display = 'grid';
  
  files.forEach(file => {
    const isVideo = file.mimeType.startsWith('video/');
    const card = document.createElement('button');
    card.className = 'media-card';
    card.setAttribute('aria-label', `Voir ${file.name}, importé le ${formatDate(file.created)}`);
    card.addEventListener('click', () => openMedia(file));
    
    // Thumbnail section
    const thumbContainer = document.createElement('div');
    thumbContainer.className = 'media-card-thumbnail-container';
    
    if (isVideo) {
      // Badge for video
      const badge = document.createElement('span');
      badge.className = 'media-type-badge';
      badge.innerHTML = '🎥 Vidéo';
      thumbContainer.appendChild(badge);
      
      // Video Play Icon overlay
      const playOverlay = document.createElement('div');
      playOverlay.className = 'video-play-overlay';
      playOverlay.innerHTML = '<span class="play-button-icon" aria-hidden="true">▶</span>';
      thumbContainer.appendChild(playOverlay);
      
      // If there is a Drive thumbnail, load it. Otherwise, show fallback icon.
      if (file.thumbnailLink) {
        const img = document.createElement('img');
        img.className = 'media-card-thumbnail';
        img.src = file.thumbnailLink;
        img.alt = '';
        img.loading = 'lazy';
        thumbContainer.appendChild(img);
      } else {
        const icon = document.createElement('span');
        icon.className = 'media-card-icon';
        icon.innerHTML = '🎬';
        thumbContainer.appendChild(icon);
      }
    } else {
      // Photo badge
      const badge = document.createElement('span');
      badge.className = 'media-type-badge';
      badge.innerHTML = '📷 Photo';
      thumbContainer.appendChild(badge);
      
      // Try to load direct fast image thumbnail.
      // We use the direct google content link with width parameter =w300-h300-p for cropped squares.
      // E.g. https://lh3.googleusercontent.com/d/FILE_ID=w300-h300-p
      const img = document.createElement('img');
      img.className = 'media-card-thumbnail';
      
      if (APPS_SCRIPT_URL === 'demo') {
        img.src = file.thumbnailLink || file.webViewLink;
      } else {
        img.src = `https://lh3.googleusercontent.com/d/${file.id}=w300-h300-p`;
      }
      
      img.alt = '';
      img.loading = 'lazy';
      
      // Fallback in case of error (e.g. not public yet)
      img.onerror = () => {
        img.style.display = 'none';
        const fallbackIcon = document.createElement('span');
        fallbackIcon.className = 'media-card-icon';
        fallbackIcon.innerHTML = '🖼️';
        thumbContainer.appendChild(fallbackIcon);
      };
      
      thumbContainer.appendChild(img);
    }
    
    // Details Section
    const details = document.createElement('div');
    details.className = 'media-card-details';
    
    const name = document.createElement('div');
    name.className = 'media-card-name';
    name.innerText = file.name;
    
    const date = document.createElement('div');
    date.className = 'media-card-date';
    date.innerText = formatDate(file.created);
    
    details.appendChild(name);
    details.appendChild(date);
    
    card.appendChild(thumbContainer);
    card.appendChild(details);
    galleryGrid.appendChild(card);
  });
}

// Handle Multiple Files Selected
function handleFilesSelected(fileList) {
  if (!APPS_SCRIPT_URL) {
    alert("Veuillez configurer l'URL Apps Script avant d'importer des fichiers.");
    showApiConfig(true);
    return;
  }
  
  const filesArray = Array.from(fileList);
  
  // Show queue section
  uploadQueueSection.style.display = 'block';
  
  filesArray.forEach(file => {
    // Check file size (Google Apps Script request payload limit ~50MB. We recommend < 30MB)
    const MAX_SIZE = 35 * 1024 * 1024; // 35MB
    if (file.size > MAX_SIZE) {
      alert(`Le fichier "${file.name}" dépasse la limite recommandée de 35 Mo pour l'importation directe. Il risque d'échouer.`);
    }
    
    const fileId = 'upload-' + Math.random().toString(36).substr(2, 9);
    
    // Create local object URL for preview
    const objectUrl = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    
    // Add to state queue
    const uploadItem = {
      id: fileId,
      file: file,
      progress: 0,
      status: 'pending',
      objectUrl: objectUrl,
      isVideo: isVideo
    };
    uploadQueue.push(uploadItem);
    
    // Add to UI
    renderUploadCard(uploadItem);
    
    // Start uploading
    uploadFile(uploadItem);
  });
}

// Render Upload Card
function renderUploadCard(item) {
  const card = document.createElement('div');
  card.className = 'upload-card';
  card.id = item.id;
  
  // Header with Preview & Info
  const header = document.createElement('div');
  header.className = 'upload-card-header';
  
  const previewContainer = document.createElement('div');
  previewContainer.className = 'upload-preview-container';
  
  if (item.isVideo) {
    const video = document.createElement('video');
    video.className = 'upload-preview-img';
    video.src = item.objectUrl;
    video.muted = true;
    video.currentTime = 0.5; // grab quick frame
    previewContainer.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.className = 'upload-preview-img';
    img.src = item.objectUrl;
    img.alt = '';
    previewContainer.appendChild(img);
  }
  
  const info = document.createElement('div');
  info.className = 'upload-card-info';
  
  const name = document.createElement('div');
  name.className = 'upload-card-name';
  name.innerText = item.file.name;
  
  const status = document.createElement('div');
  status.className = 'upload-card-status';
  status.id = `status-${item.id}`;
  status.innerText = 'En attente...';
  
  info.appendChild(name);
  info.appendChild(status);
  
  header.appendChild(previewContainer);
  header.appendChild(info);
  
  // Progress Bar
  const progressContainer = document.createElement('div');
  progressContainer.className = 'upload-progress-container';
  
  const progressBar = document.createElement('div');
  progressBar.className = 'upload-progress-bar';
  progressBar.id = `progress-${item.id}`;
  progressBar.style.width = '0%';
  
  progressContainer.appendChild(progressBar);
  
  // Loader Spinner container
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'upload-status-indicator';
  statusIndicator.id = `indicator-${item.id}`;
  statusIndicator.innerHTML = '<span class="spinner"></span> <span>Conversion en base64...</span>';
  
  card.appendChild(header);
  card.appendChild(progressContainer);
  card.appendChild(statusIndicator);
  
  uploadQueueGrid.appendChild(card);
}

// Upload File via XHR for real-time progress
function uploadFile(item) {
  const reader = new FileReader();
  
  // Update state
  item.status = 'reading';
  document.getElementById(`status-${item.id}`).innerText = 'Lecture du fichier...';
  
  reader.onload = function(e) {
    // Extract base64 content
    const base64Content = e.target.result.split(',')[1];
    
    item.status = 'uploading';
    document.getElementById(`status-${item.id}`).innerText = 'Envoi vers Google Drive...';
    document.getElementById(`indicator-${item.id}`).innerHTML = '<span class="spinner"></span> <span>Téléversement...</span>';
    
    if (APPS_SCRIPT_URL === 'demo') {
      simulateDemoUpload(item);
      return;
    }
    
    // Native XHR for Upload Progress bar
    const xhr = new XMLHttpRequest();
    xhr.open('POST', APPS_SCRIPT_URL, true);
    xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8'); // Avoid CORS OPTIONS preflight
    
    // Progress Listener
    xhr.upload.onprogress = function(event) {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        item.progress = percent;
        
        const progressBar = document.getElementById(`progress-${item.id}`);
        if (progressBar) {
          progressBar.style.width = `${percent}%`;
        }
        
        const statusEl = document.getElementById(`status-${item.id}`);
        if (statusEl) {
          statusEl.innerText = `Envoi : ${percent}%`;
        }
      }
    };
    
    // Success / Error Listener
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            handleUploadSuccess(item, response);
          } else {
            handleUploadError(item, response.error || "Erreur interne Apps Script");
          }
        } catch (err) {
          handleUploadError(item, "Impossible de lire la réponse du serveur");
        }
      } else {
        handleUploadError(item, `Code HTTP d'erreur ${xhr.status}`);
      }
    };
    
    // Error Connection
    xhr.onerror = function() {
      handleUploadError(item, "Erreur de connexion internet.");
    };
    
    // Send Payload
    const payload = JSON.stringify({
      base64: base64Content,
      name: item.file.name,
      mimeType: item.file.type
    });
    
    xhr.send(payload);
  };
  
  reader.onerror = function() {
    handleUploadError(item, "Erreur lors de la lecture locale du fichier.");
  };
  
  // Read file as DataURL (base64)
  reader.readAsDataURL(item.file);
}

// Simulate Demo Mode Upload
function simulateDemoUpload(item) {
  let percent = 0;
  const interval = setInterval(() => {
    percent += Math.floor(Math.random() * 20) + 5;
    if (percent >= 100) {
      percent = 100;
      clearInterval(interval);
      
      // Create mock file item
      const mockItem = {
        id: 'demo-' + Math.random().toString(36).substr(2, 9),
        name: item.file.name,
        mimeType: item.file.type,
        created: Date.now(),
        size: item.file.size,
        webViewLink: item.objectUrl, // Use local blob url for preview!
        thumbnailLink: item.isVideo ? null : item.objectUrl
      };
      
      // Save in sessionStorage
      const demoMedias = JSON.parse(sessionStorage.getItem('AEV_DEMO_MEDIAS') || '[]');
      demoMedias.unshift(mockItem); // add newest first
      sessionStorage.setItem('AEV_DEMO_MEDIAS', JSON.stringify(demoMedias));
      
      handleUploadSuccess(item, mockItem);
    }
    
    const progressBar = document.getElementById(`progress-${item.id}`);
    if (progressBar) progressBar.style.width = `${percent}%`;
    
    const statusEl = document.getElementById(`status-${item.id}`);
    if (statusEl) statusEl.innerText = `Envoi : ${percent}%`;
    
  }, 300);
}

// Handle Success Upload
function handleUploadSuccess(item, serverItem) {
  item.status = 'success';
  item.progress = 100;
  
  const card = document.getElementById(item.id);
  if (!card) return;
  
  card.style.borderColor = 'green';
  
  const progressBar = document.getElementById(`progress-${item.id}`);
  if (progressBar) {
    progressBar.style.width = '100%';
    progressBar.style.backgroundColor = 'green';
  }
  
  const statusEl = document.getElementById(`status-${item.id}`);
  if (statusEl) statusEl.innerText = '✅ Importation réussie !';
  
  const indicatorEl = document.getElementById(`indicator-${item.id}`);
  if (indicatorEl) {
    indicatorEl.innerHTML = '<span style="color: green; font-weight: 700;">Succès</span>';
  }
  
  // Clean object URL after some time
  setTimeout(() => {
    URL.revokeObjectURL(item.objectUrl);
  }, 10000);
  
  // Remove card from queue UI after 3 seconds
  setTimeout(() => {
    card.style.transition = 'opacity 0.5s';
    card.style.opacity = '0';
    setTimeout(() => {
      card.remove();
      // Hide queue section if empty
      checkQueueEmpty();
    }, 500);
  }, 3000);
  
  // Reload/Add to gallery dynamically
  if (APPS_SCRIPT_URL === 'demo') {
    loadGallery();
  } else {
    // Add directly to mediaList at the beginning
    mediaList.unshift(serverItem);
    renderGallery(mediaList);
  }
}

// Handle Error Upload
function handleUploadError(item, errorMessage) {
  item.status = 'error';
  
  const card = document.getElementById(item.id);
  if (!card) return;
  
  card.style.borderColor = 'var(--color-error)';
  
  const progressBar = document.getElementById(`progress-${item.id}`);
  if (progressBar) {
    progressBar.style.backgroundColor = 'var(--color-error)';
  }
  
  const statusEl = document.getElementById(`status-${item.id}`);
  if (statusEl) statusEl.innerText = '❌ Échec';
  
  const indicatorEl = document.getElementById(`indicator-${item.id}`);
  if (indicatorEl) {
    indicatorEl.innerHTML = `<span style="color: var(--color-error); font-size: 14px; font-weight: 700;">${errorMessage}</span>`;
  }
  
  // Clean object URL
  URL.revokeObjectURL(item.objectUrl);
  
  // Keep card visible so user can see what failed. Provide close button on card.
  const closeBtn = document.createElement('button');
  closeBtn.innerText = 'Retirer';
  closeBtn.className = 'btn btn-secondary';
  closeBtn.style.marginTop = '8px';
  closeBtn.style.minHeight = '32px';
  closeBtn.style.padding = '4px 8px';
  closeBtn.style.fontSize = '12px';
  closeBtn.addEventListener('click', () => {
    card.remove();
    checkQueueEmpty();
  });
  card.appendChild(closeBtn);
}

function checkQueueEmpty() {
  const activeCards = uploadQueueGrid.querySelectorAll('.upload-card');
  if (activeCards.length === 0) {
    uploadQueueSection.style.display = 'none';
    uploadQueue = [];
  }
}

// View Media Modal
function openMedia(file) {
  const isVideo = file.mimeType.startsWith('video/');
  modalMediaContainer.innerHTML = '';
  modalTitle.innerText = file.name;
  
  if (isVideo) {
    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'modal-iframe-container';
    
    const iframe = document.createElement('iframe');
    iframe.className = 'modal-iframe';
    
    if (APPS_SCRIPT_URL === 'demo') {
      // In demo mode, play mp4 directly
      const video = document.createElement('video');
      video.src = file.webViewLink;
      video.controls = true;
      video.autoplay = true;
      video.style.width = '100%';
      video.style.maxHeight = '70vh';
      modalMediaContainer.appendChild(video);
      mediaModal.showModal();
      mediaModal.classList.add('active');
      return;
    }
    
    // Normal Mode: Embed Drive preview iframe
    iframe.src = `https://drive.google.com/file/d/${file.id}/preview`;
    iframe.setAttribute('allow', 'autoplay; encrypted-media');
    iframe.setAttribute('allowfullscreen', 'true');
    
    iframeContainer.appendChild(iframe);
    modalMediaContainer.appendChild(iframeContainer);
  } else {
    const img = document.createElement('img');
    img.className = 'modal-img';
    
    if (APPS_SCRIPT_URL === 'demo') {
      img.src = file.webViewLink;
    } else {
      // Use direct large photo content link
      img.src = `https://lh3.googleusercontent.com/d/${file.id}`;
    }
    
    img.alt = file.name;
    modalMediaContainer.appendChild(img);
  }
  
  mediaModal.showModal();
  mediaModal.classList.add('active');
  
  // Set focus to close button for accessibility
  setTimeout(() => {
    modalClose.focus();
  }, 100);
}

function closeModal() {
  mediaModal.close();
  mediaModal.classList.remove('active');
  // Clear modal contents to stop playing iframe videos in background
  modalMediaContainer.innerHTML = '';
}

// Helpers
function formatDate(timestamp) {
  if (!timestamp) return 'Date inconnue';
  const date = new Date(timestamp);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
