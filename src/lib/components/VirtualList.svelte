<script>
  export let items = [];
  export let itemHeight = 34;
  export let startIndex = 0;
  let className = '';
  export { className as class };

  let scrollTop = 0;
  let clientHeight = 0;
  let container;

  $: totalCount = Math.max(0, items.length - startIndex);

  $: visibleItemCount = itemHeight ? Math.ceil(clientHeight / itemHeight) : 0;
  $: startNode = itemHeight ? Math.floor(scrollTop / itemHeight) : 0;

  const buffer = 5;
  $: renderStart = Math.max(0, startNode - buffer);
  $: renderEnd = Math.min(totalCount, startNode + visibleItemCount + buffer);

  $: paddingTop = renderStart * itemHeight;
  $: paddingBottom = Math.max(0, (totalCount - renderEnd) * itemHeight);

  $: visibleItems = items.slice(startIndex + renderStart, startIndex + renderEnd).map((item, i) => ({
    item,
    index: startIndex + renderStart + i,
    key: item.path || (startIndex + renderStart + i)
  }));
</script>

<div
  class={className}
  bind:this={container}
  on:scroll={(e) => scrollTop = e.target.scrollTop}
  bind:clientHeight={clientHeight}
  style="overflow-y: auto; overflow-anchor: none;">

  <div style="padding-top: {paddingTop}px; padding-bottom: {paddingBottom}px; box-sizing: border-box;">
    {#each visibleItems as { item, index, key } (key)}
      <slot {item} {index}></slot>
    {/each}
  </div>
</div>
