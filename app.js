/**
 * Aix en Vue - Minimalist Media Vault Logic
 */

// State Management
let APPS_SCRIPT_URL = localStorage.getItem('AEV_APPS_SCRIPT_URL') || 'https://script.google.com/macros/s/AKfycbypso6iJY_7I2ZFTKEx0mFCG-9boYOWTiYW7z6X69uZkaLf_-tvcntYfi_5ORnhCIpyzA/exec';
let mediaList = [];
let uploadQueue = [];
let itemsToShow = 10;
let deferredPrompt = null; // PWA installation prompt

// DOM Elements
const apiConfigBanner = document.getElementById('api-config-banner');
const apiUrlInput = document.getElementById('api-url-input');
const saveApiUrlBtn = document.getElementById('save-api-url-btn');
const filePicker = document.getElementById('file-picker');
const uploadQueueSection = document.getElementById('upload-queue-section');
const uploadQueueGrid = document.getElementById('upload-queue-grid');
const galleryGrid = document.getElementById('gallery-grid');
const gallerySkeleton = document.getElementById('gallery-skeleton');
const galleryEmpty = document.getElementById('gallery-empty');
const loadMoreBtn = document.getElementById('load-more-btn');

// Modal Elements
const mediaModal = document.getElementById('media-modal');
const modalMediaContainer = document.getElementById('modal-media-container');
const modalClose = document.getElementById('modal-close');

// Help Modal Elements
const helpModal = document.getElementById('help-modal');
const helpBtn = document.getElementById('help-btn');
const helpClose = document.getElementById('help-close');
const shareAppBtn = document.getElementById('share-app-btn');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setupEventListeners();
  setupPwa();
  
  if (!APPS_SCRIPT_URL) {
    showApiConfig(true);
  } else {
    showApiConfig(false);
    loadGallery();
  }
}

// PWA Management
function setupPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registered:', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
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
  // Config
  if (saveApiUrlBtn) {
    saveApiUrlBtn.addEventListener('click', handleSaveConfig);
  }
  
  // File Picker
  filePicker.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
  });
  
  // Load More Button
  loadMoreBtn.addEventListener('click', () => {
    itemsToShow += 10;
    renderGallery();
  });
  
  // Help Modal Toggle
  if (helpBtn) {
    helpBtn.addEventListener('click', openHelp);
  }
  if (helpClose) {
    helpClose.addEventListener('click', closeHelp);
  }
  if (helpModal) {
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) closeHelp();
    });
  }
  if (shareAppBtn) {
    shareAppBtn.addEventListener('click', shareApp);
  }
  
  // Modal Close
  modalClose.addEventListener('click', closeModal);
  mediaModal.addEventListener('click', (e) => {
    if (e.target === mediaModal) closeModal();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (mediaModal.open) closeModal();
      if (helpModal.open) closeHelp();
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
    alert("Veuillez entrer une URL Apps Script valide.");
    return;
  }
  
  if (url.toLowerCase() === 'demo') {
    url = 'demo';
    initDemoData();
  }
  
  APPS_SCRIPT_URL = url;
  localStorage.setItem('AEV_APPS_SCRIPT_URL', url);
  showApiConfig(false);
  loadGallery();
}

// Demo Mode Data
function initDemoData() {
  if (!sessionStorage.getItem('AEV_DEMO_MEDIAS')) {
    const demoMedias = [
      {
        id: 'demo-img-1',
        name: 'Photo 1.jpg',
        mimeType: 'image/jpeg',
        created: Date.now() - 3600000 * 2,
        size: 2450000,
        webViewLink: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        thumbnailLink: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=150&h=150&q=80'
      },
      {
        id: 'demo-vid-1',
        name: 'Video 1.mp4',
        mimeType: 'video/mp4',
        created: Date.now() - 3600000 * 24,
        size: 15400000,
        webViewLink: 'https://www.w3schools.com/html/mov_bbb.mp4',
        thumbnailLink: null
      },
      {
        id: 'demo-img-2',
        name: 'Photo 2.jpg',
        mimeType: 'image/png',
        created: Date.now() - 3600000 * 48,
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
  loadMoreBtn.style.display = 'none';
  gallerySkeleton.style.display = 'grid';
  
  if (!APPS_SCRIPT_URL) {
    gallerySkeleton.style.display = 'none';
    showApiConfig(true);
    return;
  }
  
  try {
    if (APPS_SCRIPT_URL === 'demo') {
      await new Promise(resolve => setTimeout(resolve, 800));
      const demoMedias = JSON.parse(sessionStorage.getItem('AEV_DEMO_MEDIAS') || '[]');
      mediaList = demoMedias;
      itemsToShow = 10;
      renderGallery();
      return;
    }
    
    const response = await fetch(`${APPS_SCRIPT_URL}?action=list`, {
      method: 'GET',
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      mediaList = data.files || [];
      itemsToShow = 10;
      renderGallery();
    } else {
      throw new Error(data.error || "Erreur inconnue");
    }
  } catch (err) {
    console.error("Gallery Load Error:", err);
    gallerySkeleton.style.display = 'none';
    alert(`Erreur de chargement : ${err.message}`);
    showApiConfig(true);
    galleryEmpty.style.display = 'block';
  }
}

// Render Gallery with Pagination
function renderGallery() {
  gallerySkeleton.style.display = 'none';
  
  if (!mediaList || mediaList.length === 0) {
    galleryGrid.style.display = 'none';
    galleryEmpty.style.display = 'flex';
    loadMoreBtn.style.display = 'none';
    return;
  }
  
  galleryEmpty.style.display = 'none';
  galleryGrid.style.display = 'grid';
  
  // Clear grid
  galleryGrid.innerHTML = '';
  
  // Slice based on itemsToShow
  const visibleItems = mediaList.slice(0, itemsToShow);
  
  visibleItems.forEach(file => {
    const isVideo = file.mimeType.startsWith('video/');
    const card = document.createElement('button');
    card.className = 'media-card';
    card.addEventListener('click', () => openMedia(file));
    
    const thumbContainer = document.createElement('div');
    thumbContainer.className = 'media-card-thumbnail-container';
    
    if (isVideo) {
      const playOverlay = document.createElement('div');
      playOverlay.className = 'video-play-overlay';
      playOverlay.innerHTML = '<span class="play-button-icon" aria-hidden="true">▶</span>';
      thumbContainer.appendChild(playOverlay);
      
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
      const img = document.createElement('img');
      img.className = 'media-card-thumbnail';
      
      if (APPS_SCRIPT_URL === 'demo') {
        img.src = file.thumbnailLink || file.webViewLink;
      } else {
        img.src = `https://lh3.googleusercontent.com/d/${file.id}=w300-h300-p`;
      }
      
      img.alt = '';
      img.loading = 'lazy';
      
      img.onerror = () => {
        img.style.display = 'none';
        const fallbackIcon = document.createElement('span');
        fallbackIcon.className = 'media-card-icon';
        fallbackIcon.innerHTML = '🖼️';
        thumbContainer.appendChild(fallbackIcon);
      };
      
      thumbContainer.appendChild(img);
    }
    
    card.appendChild(thumbContainer);
    galleryGrid.appendChild(card);
  });
  
  // Show / Hide Load More
  if (itemsToShow < mediaList.length) {
    loadMoreBtn.style.display = 'flex';
  } else {
    loadMoreBtn.style.display = 'none';
  }
}

// Handle Multiple Files Selected
function handleFilesSelected(fileList) {
  if (!APPS_SCRIPT_URL) {
    alert("Veuillez configurer l'URL Apps Script.");
    showApiConfig(true);
    return;
  }
  
  const filesArray = Array.from(fileList);
  uploadQueueSection.style.display = 'block';
  
  filesArray.forEach(file => {
    const fileId = 'upload-' + Math.random().toString(36).substr(2, 9);
    const objectUrl = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    
    const uploadItem = {
      id: fileId,
      file: file,
      progress: 0,
      status: 'pending',
      objectUrl: objectUrl,
      isVideo: isVideo
    };
    uploadQueue.push(uploadItem);
    
    renderUploadCard(uploadItem);
    uploadFile(uploadItem);
  });
}

// Render Upload Card
function renderUploadCard(item) {
  const card = document.createElement('div');
  card.className = 'upload-card';
  card.id = item.id;
  
  const header = document.createElement('div');
  header.className = 'upload-card-header';
  
  const previewContainer = document.createElement('div');
  previewContainer.className = 'upload-preview-container';
  
  if (item.isVideo) {
    const video = document.createElement('video');
    video.className = 'upload-preview-img';
    video.src = item.objectUrl;
    video.muted = true;
    video.currentTime = 0.5;
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
  status.innerText = 'Lecture...';
  
  info.appendChild(name);
  info.appendChild(status);
  
  header.appendChild(previewContainer);
  header.appendChild(info);
  
  const progressContainer = document.createElement('div');
  progressContainer.className = 'upload-progress-container';
  
  const progressBar = document.createElement('div');
  progressBar.className = 'upload-progress-bar';
  progressBar.id = `progress-${item.id}`;
  progressBar.style.width = '0%';
  
  progressContainer.appendChild(progressBar);
  
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'upload-status-indicator';
  statusIndicator.id = `indicator-${item.id}`;
  statusIndicator.innerHTML = '<span class="spinner"></span>';
  
  card.appendChild(header);
  card.appendChild(progressContainer);
  card.appendChild(statusIndicator);
  
  uploadQueueGrid.appendChild(card);
}

// Upload File with Simulated Progress & fetch POST
function uploadFile(item) {
  const reader = new FileReader();
  item.status = 'reading';
  
  reader.onload = function(e) {
    const base64Content = e.target.result.split(',')[1];
    item.status = 'uploading';
    
    document.getElementById(`status-${item.id}`).innerText = 'Téléversement...';
    
    if (APPS_SCRIPT_URL === 'demo') {
      simulateDemoUpload(item);
      return;
    }
    
    let percent = 0;
    const progressInterval = setInterval(() => {
      if (percent < 90) {
        percent += Math.floor(Math.random() * 15) + 5;
        if (percent > 90) percent = 90;
        
        item.progress = percent;
        const progressBar = document.getElementById(`progress-${item.id}`);
        if (progressBar) progressBar.style.width = `${percent}%`;
      }
    }, 200);
    
    console.log(`[Upload] Starting fetch POST to ${APPS_SCRIPT_URL}`);
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({
        base64: base64Content,
        name: item.file.name,
        mimeType: item.file.type
      })
    })
    .then(response => {
      console.log(`[Upload] Received response with status: ${response.status}`);
      clearInterval(progressInterval);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log(`[Upload] Parsed JSON:`, data);
      if (data.success) {
        handleUploadSuccess(item, data);
      } else {
        handleUploadError(item, data.error || "Erreur de téléversement");
      }
    })
    .catch(err => {
      console.error(`[Upload] Error:`, err);
      clearInterval(progressInterval);
      handleUploadError(item, err.message || "Erreur de connexion");
    });
  };
  
  reader.onerror = function() {
    handleUploadError(item, "Erreur de lecture locale");
  };
  
  reader.readAsDataURL(item.file);
}

// Simulate Demo Mode Upload
function simulateDemoUpload(item) {
  let percent = 0;
  const interval = setInterval(() => {
    percent += Math.floor(Math.random() * 25) + 10;
    if (percent >= 100) {
      percent = 100;
      clearInterval(interval);
      
      const mockItem = {
        id: 'demo-' + Math.random().toString(36).substr(2, 9),
        name: item.file.name,
        mimeType: item.file.type,
        created: Date.now(),
        size: item.file.size,
        webViewLink: item.objectUrl,
        thumbnailLink: item.isVideo ? null : item.objectUrl
      };
      
      const demoMedias = JSON.parse(sessionStorage.getItem('AEV_DEMO_MEDIAS') || '[]');
      demoMedias.unshift(mockItem);
      sessionStorage.setItem('AEV_DEMO_MEDIAS', JSON.stringify(demoMedias));
      
      handleUploadSuccess(item, mockItem);
    }
    
    const progressBar = document.getElementById(`progress-${item.id}`);
    if (progressBar) progressBar.style.width = `${percent}%`;
  }, 200);
}

// Handle Success Upload
function handleUploadSuccess(item, serverItem) {
  item.status = 'success';
  item.progress = 100;
  
  const card = document.getElementById(item.id);
  if (!card) return;
  
  card.style.borderColor = '#22c55e';
  
  const progressBar = document.getElementById(`progress-${item.id}`);
  if (progressBar) {
    progressBar.style.width = '100%';
    progressBar.style.backgroundColor = '#22c55e';
  }
  
  const statusEl = document.getElementById(`status-${item.id}`);
  if (statusEl) statusEl.innerText = '✅ Succès';
  
  const indicatorEl = document.getElementById(`indicator-${item.id}`);
  if (indicatorEl) indicatorEl.innerHTML = '';
  
  setTimeout(() => {
    URL.revokeObjectURL(item.objectUrl);
  }, 10000);
  
  setTimeout(() => {
    card.style.transition = 'opacity 0.5s';
    card.style.opacity = '0';
    setTimeout(() => {
      card.remove();
      checkQueueEmpty();
    }, 500);
  }, 2000);
  
  // Add to local list and re-render
  mediaList.unshift(serverItem);
  renderGallery();
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
    indicatorEl.innerHTML = `<span style="color: var(--color-error); font-size: 12px; font-weight: 600;">${errorMessage}</span>`;
  }
  
  URL.revokeObjectURL(item.objectUrl);
  
  const closeBtn = document.createElement('button');
  closeBtn.innerText = 'Fermer';
  closeBtn.className = 'btn btn-secondary';
  closeBtn.style.padding = '4px 8px';
  closeBtn.style.fontSize = '12px';
  closeBtn.style.borderRadius = '6px';
  closeBtn.style.marginTop = '8px';
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
  
  if (isVideo) {
    if (APPS_SCRIPT_URL === 'demo') {
      const video = document.createElement('video');
      video.src = file.webViewLink;
      video.controls = true;
      video.autoplay = true;
      video.style.width = '100%';
      video.style.maxHeight = '80vh';
      modalMediaContainer.appendChild(video);
    } else {
      const iframeContainer = document.createElement('div');
      iframeContainer.className = 'modal-iframe-container';
      
      const iframe = document.createElement('iframe');
      iframe.className = 'modal-iframe';
      iframe.src = `https://drive.google.com/file/d/${file.id}/preview`;
      iframe.setAttribute('allow', 'autoplay; encrypted-media');
      iframe.setAttribute('allowfullscreen', 'true');
      
      iframeContainer.appendChild(iframe);
      modalMediaContainer.appendChild(iframeContainer);
    }
  } else {
    const img = document.createElement('img');
    img.className = 'modal-img';
    img.src = APPS_SCRIPT_URL === 'demo' ? file.webViewLink : `https://lh3.googleusercontent.com/d/${file.id}`;
    img.alt = '';
    modalMediaContainer.appendChild(img);
  }
  
  mediaModal.showModal();
  mediaModal.classList.add('active');
  
  setTimeout(() => {
    modalClose.focus();
  }, 100);
}

function closeModal() {
  mediaModal.close();
  mediaModal.classList.remove('active');
  modalMediaContainer.innerHTML = '';
}

// Help Modal Functions
function openHelp() {
  if (helpModal) {
    helpModal.showModal();
    helpModal.classList.add('active');
    setTimeout(() => {
      helpClose.focus();
    }, 100);
  }
}

function closeHelp() {
  if (helpModal) {
    helpModal.close();
    helpModal.classList.remove('active');
  }
}

// Sharing Logic (Web Share API with Clipboard Fallback)
function shareApp() {
  const shareData = {
    title: 'Aix en Vue - Médias',
    text: 'Hub de téléversement et de stockage des photos et vidéos pour Aix en Vue.',
    url: 'https://tinyurl.com/aev-photo'
  };

  if (navigator.share) {
    navigator.share(shareData)
      .then(() => console.log('[Share] Successful share'))
      .catch((error) => console.log('[Share] Error sharing:', error));
  } else {
    // Fallback: Copy to clipboard
    navigator.clipboard.writeText(shareData.url)
      .then(() => {
        const originalText = shareAppBtn.innerText;
        shareAppBtn.innerText = '✅ Lien copié !';
        shareAppBtn.style.backgroundColor = '#22c55e';
        shareAppBtn.style.color = '#ffffff';
        
        setTimeout(() => {
          shareAppBtn.innerText = originalText;
          shareAppBtn.style.backgroundColor = '';
          shareAppBtn.style.color = '';
        }, 2000);
      })
      .catch((err) => {
        console.error('[Share] Could not copy text: ', err);
        alert('Impossible de copier automatiquement le lien. Copiez ceci : ' + shareData.url);
      });
  }
}
