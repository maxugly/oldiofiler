<script>
    import '../styles/global.css';
    import { onMount } from 'svelte';
    import { formatSize, formatDate, updateZoom } from '$lib/utils';
    import { getAudioFiles, moveFile, copyFile, exitApp, convertFileSrc } from '$lib/tauri-api';
    import { open } from '@tauri-apps/plugin-dialog';
    import WaveSurfer from 'wavesurfer.js';
    import { Folder, RefreshCw, X, Play, Pause, SkipForward, Copy, Move, Paintbrush } from 'lucide-svelte';
    import { watchImmediate } from '@tauri-apps/plugin-fs';
  
    let isProcessing = false;
    let isSorting = false;
    let isRepeatEnabled = false;
    let debounceTimer;
    let unwatch;
    let inDir = "";
    let outDirsString = "/good /bad /trash";
    let fileQueue = [];
    let currentIndex = 0;
    let currentFile = null;
    let wavesurfer;
    let waveHeight = 120;
    let isPlaying = false;
    let codec = "Audio";
    let totalFiles = 0;
    let barHeight = 12;
    let sortMode = 'move';
    let zoomLevel = .9;
    let skippedFilePaths = new Set();
	const fonts = ['jetbrains', 'fira', 'roboto'];
	let currentFontIndex = 0;
	let currentFont = 'jetbrains';

	function applyFont(fontName) {
	  fonts.forEach(f => document.body.classList.remove(`font-${f}`));
	  document.body.classList.add(`font-${fontName}`);
	  localStorage.setItem('sorta-font', fontName);
	  currentFont = fontName;
	}

	function toggleFont() {
	  currentFontIndex = (currentFontIndex + 1) % fonts.length;
	  applyFont(fonts[currentFontIndex]);
	}

    const themes = ['blue', 'red', 'green', 'purple', 'pink', 'orange', 'teal', 'yellow', 'brown'];
    let currentThemeIndex = 0;
    let currentTheme = 'blue';
  
    const taglines = [
      "The Lazy Way to Sort Files",
      "Effortlessly Sort Your Mess",
      "File Sorting for Procrastinators",
      "For When You've Been Putting It Off",
      "Get Your Files Sorta Organized",
      "Finally Sort That Mess",
      "One File at a Time",
      "Minimal Effort, Maximum Control",
      "File Sorting for Humans",
      "Easy Manual Sorting",
      "Sort Files, Zero Effort",
      "Your Chill File Organizer",
      "The Lazy File Sorter",
      "Casual, Lazy, Procrastinated, Manual, File Sorting"
    ];
    let currentTagline = taglines[0];

    function cycleTagline() {
      const newIndex = Math.floor(Math.random() * taglines.length);
      currentTagline = taglines[newIndex];
    }
  
    function applyTheme(themeName) {
      document.body.className = ''; 
      document.body.classList.add(`theme-${themeName}`);
      localStorage.setItem('sorta-theme', themeName);
      currentTheme = themeName;
    }
  
    function toggleTheme() {
      currentThemeIndex = (currentThemeIndex + 1) % themes.length;
      applyTheme(themes[currentThemeIndex]);
    }
  
    function toggleSortMode() {
      sortMode = sortMode === 'move' ? 'copy' : 'move';
    }
  
    function toggleRepeat() {
      isRepeatEnabled = !isRepeatEnabled;
    }
  
    function updateWaveHeight() {
        if (wavesurfer) {
            wavesurfer.setOptions({ height: waveHeight });
        }
    }
  
    $: if (wavesurfer) wavesurfer.setOptions({ height: waveHeight });
    $: zoomLevel, updateZoom(zoomLevel);
  
    $: buttons = outDirsString.split(' ').filter(d => d.trim() !== "");
    $: currentPrimaryColor = getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim();

    $: if (wavesurfer && currentTheme) {
        const style = getComputedStyle(document.body);
        wavesurfer.setOptions({
            waveColor: style.getPropertyValue('--c-primary').trim(),
            progressColor: style.getPropertyValue('--c-primary-hover').trim()
        });
    }
    
      onMount(() => {
        console.log('onMount: Component mounted.');
    
        const savedTheme = localStorage.getItem('sorta-theme');
        if (savedTheme && themes.includes(savedTheme)) {
          currentThemeIndex = themes.indexOf(savedTheme);
          applyTheme(savedTheme);
        } else {
          applyTheme(themes[currentThemeIndex]);
        }
        
        currentTheme = themes[currentThemeIndex];  

        const savedFont = localStorage.getItem('sorta-font');
        if (savedFont && fonts.includes(savedFont)) {
          currentFontIndex = fonts.indexOf(savedFont);
          applyFont(savedFont);
        } else {
          applyFont(fonts[currentFontIndex]);
        }
      
      updateZoom(zoomLevel);
  
      const style = getComputedStyle(document.body);
      const waveColor = style.getPropertyValue('--c-primary').trim();
      const progressColor = style.getPropertyValue('--c-primary-hover').trim();
  

      wavesurfer = WaveSurfer.create({
          container: '#waveform',
          waveColor: waveColor || '#007bff',
          progressColor: progressColor || '#0056b3',
          height: 120,
          backend: 'WebAudio',
          normalize: false,
          partialRender: true,
      });
      console.log('onMount: WaveSurfer created.', wavesurfer);
  
  
      wavesurfer.on('play', () => isPlaying = true);
      wavesurfer.on('pause', () => isPlaying = false);
      wavesurfer.on('finish', () => {
        console.log('WaveSurfer: finish event triggered.');
        if (isRepeatEnabled) {
          console.log('WaveSurfer: Repeat enabled, restarting current file.');
          wavesurfer.seekTo(0);
          wavesurfer.play();
        }
      });
    });

  async function selectInDir() {
      console.log('selectInDir: called.');
      const selected = await open({ directory: true });
      if (selected) {
          inDir = selected;
          console.log('selectInDir: inDir set to', inDir);
          if (unwatch) unwatch();
          skippedFilePaths.clear();
          refresh();

          unwatch = await watchImmediate(inDir, (event) => {
              if (isProcessing) return;

              clearTimeout(debounceTimer);
              debounceTimer = setTimeout(async () => {
                  const filesOnDisk = await getAudioFiles(inDir);
                  const currentlyDisplayableFiles = filesOnDisk.filter(file => !skippedFilePaths.has(file.path));

                  if (currentlyDisplayableFiles.length !== (fileQueue.length - currentIndex)) {
                      refresh();
                  }
              }, 1000);
          });
      }
  }

  async function refresh() {
    console.log('refresh: called. inDir:', inDir);
    if (!inDir) return;
    const files = await getAudioFiles(inDir);
    console.log('refresh: getAudioFiles returned', files.length, 'files:', files);
    fileQueue = files.filter(file => !skippedFilePaths.has(file.path));
    totalFiles = fileQueue.length;
    currentIndex = 0;
    if (!currentFile) {
      loadNext();
    }
  }

  async function skip() {
    console.log('skip: called.');
    if (!currentFile || isProcessing) return;

    isProcessing = true;

    try {
        skippedFilePaths.add(currentFile.path);
        currentIndex++;
        await loadNext();
    } catch (error) {
        console.error('Error during skip:', error);
    } finally {
        isProcessing = false;
    }
  }

  function handleKeydown(e) {
    const activeElem = document.activeElement.tagName;
    if (activeElem === 'INPUT' || activeElem === 'TEXTAREA') {
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      wavesurfer.playPause();
    } else if (e.key === 'ArrowRight') {
      wavesurfer.skip(5);
    } else if (e.key === 'ArrowLeft') {
      wavesurfer.skip(-5);
    } else if ((e.key >= '1' && e.key <= '9') || e.key === '0') {
      const index = (parseInt(e.key) + 9) % 10;
      if (buttons[index]) sortFile(buttons[index]);
    } else if (e.key.toLowerCase() === 's') {
      skip();
    } else if (e.key.toLowerCase() === 'r') { // Shortcut for Refresh
      toggleRepeat();
    } else if (e.key.toLowerCase() === 'q') { // Shortcut for Quit
      exitApp();
    } else if (e.key.toLowerCase() === 'o') { // Shortcut for Open
      selectInDir();
    } else if (e.key.toLowerCase() === 't') { // Shortcut for Theme
      toggleTheme();
    } else if (e.key.toLowerCase() === 'm') { // Shortcut for Move/Copy mode
      toggleSortMode();
    } else if (e.key.toLowerCase() === '[') { // Shortcut for Decrease Waveform Height
      decreaseWaveHeight();
    } else if (e.key.toLowerCase() === ']') { // Shortcut for Increase Waveform Height
      increaseWaveHeight();
    } else if (e.key.toLowerCase() === 'n') { // Shortcut for Next
      skip();
    } else if (e.key.toLowerCase() === 'f') { // Shortcut for Font
      toggleFont();
    } else if (e.key === '+' || e.key === '=') { // '+' is often produced by Shift + '='
      e.preventDefault(); // Prevent browser zoom
      increaseZoom();
    } else if (e.key === '-') {
      e.preventDefault(); // Prevent browser zoom
      decreaseZoom();
    }
  }

  async function loadNext() {
      console.log('loadNext: called. currentIndex:', currentIndex, 'fileQueue.length:', fileQueue.length);
      if (currentIndex < fileQueue.length) {
          const nextFile = fileQueue[currentIndex];
          console.log('loadNext: nextFile', nextFile);
          if (currentFile && currentFile.path === nextFile.path) return;

          currentFile = nextFile;
          const assetUrl = convertFileSrc(currentFile.path);
          console.log('loadNext: Loading asset:', assetUrl);

          wavesurfer.load(assetUrl);

          wavesurfer.once('ready', () => {
              console.log('loadNext: WaveSurfer ready. Playing audio.');
              wavesurfer.setTime(0);
              wavesurfer.play().catch(() => {
                console.error('loadNext: Error playing audio.');
              });
          });

          codec = currentFile.path.split('.').pop().toUpperCase();
      } else {
          currentFile = null;
          wavesurfer.empty();
          console.log('loadNext: fileQueue is empty.');
          if (isRepeatEnabled) {
            console.log('loadNext: Repeat enabled, refreshing queue.');
            refresh();
          }
      }
  }

  async function sortFile(targetSubDir) {
      console.log('sortFile: called with targetSubDir:', targetSubDir);
      if (!currentFile || isProcessing) return;

      isProcessing = true;

      try {
          const commandFunction = sortMode === 'move' ? moveFile : copyFile;
          console.log('sortFile: Executing', (sortMode === 'move' ? 'moveFile' : 'copyFile'), 'for', currentFile.path);
          await commandFunction(currentFile.path, `${inDir}/${targetSubDir.replace(/^\//, '')}`);

          currentIndex++;
          await loadNext();
          } catch (error) {
              console.error('Error during sortFile:', error);
          } finally {
              isProcessing = false;
          }
  }

  function decreaseWaveHeight() {
    waveHeight = Math.max(40, waveHeight - 5);
  }

  function increaseWaveHeight() {
    waveHeight = Math.min(300, waveHeight + 5);
  }

  function decreaseZoom() {
    zoomLevel = Math.max(0.6, zoomLevel - 0.05);
  }

  function increaseZoom() {
    zoomLevel = Math.min(1.1, zoomLevel + 0.05);
  }

</script>

<main class="container">
  <div class="header panel">
    <span 
      class="brand" 
      title="{currentTagline}"
      on:mouseenter={cycleTagline}>
      Sorta
    </span>
    <div class="header-controls">
      <button class="btn btn-compact"
              class:btn-active={isRepeatEnabled}
              on:click={toggleRepeat}
              title="[R]efresh (Toggle repeat on/off)"
              style="border: var(--border-width) solid var(--c-primary); background-color: var(--bg-panel);">
        <RefreshCw size={14}/>
      </button>

      <button class="btn btn-compact"
              class:btn-primary={sortMode === 'move'}
              class:btn-outline={sortMode === 'copy'}
              on:click={toggleSortMode}
              title="Toggle between [M]ove and Copy mode">
        {#if sortMode === 'move'}
          <Move size={14} />
        {:else}
          <Copy size={14} />
        {/if}
      </button>

      <button class="btn btn-compact"
              on:click={toggleTheme}
              title="[T]oggle theme"
              style="border: var(--border-width) solid var(--c-primary); background-color: var(--bg-panel);">
        <Paintbrush size={14} />
      </button>
      
      <button class="btn btn-compact"
              on:click={toggleFont}
              title="[F]ont switcher"
              style="border: var(--border-width) solid var(--c-primary); background-color: var(--bg-panel);">
        <span>Aa</span>
      </button>

      <div class="zoom-controls">
        <button class="btn btn-compact" on:click={decreaseZoom} title="Decrease UI size [-]">-</button>
        <button class="btn btn-compact" on:click={increaseZoom} title="Increase UI size [+]">+</button>
      </div>

	  <span class="panel codec-indicator" title="Current audio file codec">
	    <span style="color: var(--c-primary);">Codec:</span> {codec}
	  </span>

      <span class="stats panel" title="Number of files left to process">Remaining: <span class="stats-value">{fileQueue.length - currentIndex}</span></span>
    </div>
  </div>

  <div class="paths panel">
    <div class="input-row">
      <label for="in-path">IN</label>
      <input id="in-path" bind:value={inDir} placeholder="Source directory..." title="Input directory where files are scanned from" />
      <button class="btn btn-folder-icon" on:click={selectInDir} title="[O]pen source directory"><Folder size={18}/></button>
    </div>

    <div class="input-row">
      <label for="out-paths">OUT</label>
      <input id="out-paths" bind:value={outDirsString} placeholder="Subdirs..." title="Space-separated output subdirectories" />
    </div>
  </div>

  <div class="file-list panel">
      {#each fileQueue as file, i (file.path)}
        {#if i >= currentIndex}
        <div class="file-row {currentFile?.path === file.path ? 'active' : ''}">
          <span class="col-name">{file.name}</span>
          <span class="col-size">{formatSize(file.size)}</span>
          <span class="col-date">{formatDate(file.modified)}</span>
          <span class="col-date">{formatDate(file.created)}</span>
        </div>
        {/if}
      {/each}
  </div>

  <div class="waveform-frame panel"> <!-- New wrapper -->
    <div class="input-row">
      <input type="range" min="40" max="300" bind:value={waveHeight} title="Adjust waveform display height" />
      <span style="font-size: 0.7rem; color: #888; width: 40px;">{waveHeight}px</span>
    </div>

    <div id="waveform"></div>
  </div>

  <div class="controls">
    <button on:click={() => wavesurfer.playPause()} class="btn btn-icon-lg btn-primary" title="Play/Pause audio (Spacebar)">
      {#if isPlaying}<Pause size={24}/>{:else}<Play size={24}/>{/if}
    </button>
  </div>

  <div class="button-grid">
    {#each buttons as btn, i}
      <button class="btn btn-danger-outline" on:click={() => sortFile(btn)} title="{i === 9 ? '0' : i < 9 ? i + 1 : ''}: {btn}">
        <span class="key-hint panel">{i === 9 ? '0' : i < 9 ? i + 1 : ''}</span>
        {btn}
      </button>
    {/each}
    <button on:click={skip} class="btn btn-danger-outline" title="Skip current file (N)">
      <SkipForward size={24}/><span style="white-space: nowrap;"><span style="color: var(--c-primary);">[</span>N<span style="color: var(--c-primary);">]</span>ext</span>
    </button>
  </div>

</main>

<button class="btn btn-danger exit-btn" on:click={exitApp} title="[Q]uit Sorta">
  EXIT
</button>

<svelte:window on:keydown={handleKeydown} />
