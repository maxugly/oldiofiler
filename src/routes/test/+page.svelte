<script>
  import { convertFileSrc } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-dialog';

  let assetUrl = "";
  let filePath = "";

  async function pickFile() {
    const selected = await open({
      filters: [{ name: 'Audio', extensions: ['mp3', 'flac', 'wav'] }]
    });
    if (selected) {
      filePath = selected;
      assetUrl = convertFileSrc(selected);
    }
  }
</script>

<main style="background: #000; color: #0f0; height: 100vh; padding: 40px; font-family: monospace;">
  <h2>PROTOCOL DIAGNOSTIC TOOL</h2>
  <hr />
  <button on:click={pickFile} style="padding: 10px; background: #222; color: #0f0; border: 1px solid #0f0; cursor: pointer;">
    SELECT FILE
  </button>

  <p>PATH: {filePath}</p>
  <p>URL: {assetUrl}</p>

  {#if assetUrl}
    <div style="margin-top: 20px; border: 1px solid #333; padding: 20px;">
      <p>NATIVE HTML5 AUDIO TEST:</p>
      <audio src={assetUrl} controls style="width: 100%;"></audio>
    </div>
  {/if}
</main>
