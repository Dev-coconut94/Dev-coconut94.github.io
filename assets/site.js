function resolveUrl(path, baseUrl) {
  try {
    return new URL(path, baseUrl).href;
  } catch {
    return "";
  }
}

function isSafeHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function setSafeHref(anchor, path, baseUrl) {
  if (!anchor || !path) {
    return;
  }

  const resolved = resolveUrl(path, baseUrl);
  if (!resolved || !isSafeHttpUrl(resolved)) {
    return;
  }

  anchor.href = resolved;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} 파일을 불러오지 못했습니다.`);
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} 파일을 불러오지 못했습니다.`);
  }
  return response.text();
}

function createElement(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) {
    node.className = className;
  }
  if (typeof text === "string") {
    node.textContent = text;
  }
  return node;
}

function getLinkTarget(entry) {
  return entry.external_url || entry.path || "";
}

function buildMetaChip(text, className) {
  if (!text) {
    return null;
  }

  return createElement("span", className, text);
}

function normalizeStatusTone(status) {
  const source = String(status || "").toLowerCase();

  if (source.includes("준비") || source.includes("draft")) {
    return "chip chip--muted";
  }
  if (source.includes("배포") || source.includes("live") || source.includes("release")) {
    return "chip chip--live";
  }
  if (source.includes("운영") || source.includes("active")) {
    return "chip chip--success";
  }
  return "chip chip--accent";
}

function applySafeLink(node, entry, siteBaseUrl) {
  const targetPath = getLinkTarget(entry);
  setSafeHref(node, targetPath, siteBaseUrl);
  if (entry.external_url) {
    node.target = "_blank";
    node.rel = "noopener noreferrer";
  }
}

function createListRow(entry, siteBaseUrl) {
  const targetPath = getLinkTarget(entry);
  const row = document.createElement(targetPath ? "a" : "div");
  row.className = "list-row";
  if (targetPath) {
    applySafeLink(row, entry, siteBaseUrl);
  }

  const main = createElement("div", "list-row__main");
  if (entry.eyebrow) {
    main.appendChild(createElement("div", "list-row__eyebrow", entry.eyebrow));
  }

  const titleLine = createElement("div", "list-row__title-line");
  titleLine.appendChild(createElement("div", "list-row__title", entry.title || "제목 없음"));
  const badge = buildMetaChip(entry.badge, "chip chip--accent");
  if (badge) {
    titleLine.appendChild(badge);
  }
  main.appendChild(titleLine);

  if (entry.summary) {
    main.appendChild(createElement("p", "list-row__summary", entry.summary));
  }

  const meta = createElement("div", "list-row__meta");
  const categoryChip = buildMetaChip(entry.category, "chip");
  const statusChip = buildMetaChip(entry.status, normalizeStatusTone(entry.status));
  if (categoryChip) {
    meta.appendChild(categoryChip);
  }
  if (statusChip) {
    meta.appendChild(statusChip);
  }
  if (meta.childNodes.length > 0) {
    main.appendChild(meta);
  }

  row.appendChild(main);

  const side = createElement("div", "list-row__side");
  if (entry.right_meta) {
    side.appendChild(createElement("div", "list-row__right-meta", entry.right_meta));
  }
  if (entry.date) {
    side.appendChild(createElement("div", "list-row__date", entry.date));
  }
  if (targetPath) {
    side.appendChild(createElement("div", "list-row__arrow", entry.cta_label || "자세히 보기"));
  }
  row.appendChild(side);

  return row;
}

function createEmptyState(message) {
  return createElement("div", "empty-state", message || "표시할 항목이 아직 없습니다.");
}

function createFeaturedCard(entry, siteBaseUrl) {
  if (!entry) {
    return createEmptyState("대표 항목이 아직 없습니다.");
  }

  const card = createElement("article", "featured-card");

  if (entry.eyebrow) {
    card.appendChild(createElement("div", "featured-card__eyebrow", entry.eyebrow));
  }
  card.appendChild(createElement("h3", "featured-card__title", entry.title || "제목 없음"));

  if (entry.summary) {
    card.appendChild(createElement("p", "featured-card__summary", entry.summary));
  }

  const meta = createElement("div", "featured-card__meta");
  const badge = buildMetaChip(entry.badge, "chip chip--accent");
  const category = buildMetaChip(entry.category, "chip");
  const status = buildMetaChip(entry.status, normalizeStatusTone(entry.status));
  const rightMeta = buildMetaChip(entry.right_meta, "chip chip--muted");

  [badge, category, status, rightMeta].forEach((chip) => {
    if (chip) {
      meta.appendChild(chip);
    }
  });

  if (meta.childNodes.length > 0) {
    card.appendChild(meta);
  }

  const targetPath = getLinkTarget(entry);
  if (targetPath) {
    const cta = createElement("a", "button button--primary", entry.cta_label || "자세히 보기");
    applySafeLink(cta, entry, siteBaseUrl);
    card.appendChild(cta);
  }

  return card;
}

function getCollectionEntries(contentIndex, collectionName, container) {
  const source = Array.isArray(contentIndex[collectionName]) ? [...contentIndex[collectionName]] : [];
  const featuredOnly = container.dataset.featuredOnly === "true";
  const skipFeatured = container.dataset.skipFeatured === "true";
  const limit = Number.parseInt(container.dataset.limit || "", 10);

  let entries = source;
  if (featuredOnly) {
    entries = entries.filter((entry) => entry.featured);
  }
  if (skipFeatured) {
    entries = entries.filter((entry) => !entry.featured);
  }
  if (Number.isInteger(limit) && limit > 0) {
    entries = entries.slice(0, limit);
  }

  return entries;
}

function renderListCollection(container, entries, siteBaseUrl) {
  container.textContent = "";
  if (!Array.isArray(entries) || entries.length === 0) {
    container.appendChild(createEmptyState(container.dataset.emptyMessage));
    return;
  }

  for (const entry of entries) {
    container.appendChild(createListRow(entry, siteBaseUrl));
  }
}

function renderFeaturedCollection(container, entries, siteBaseUrl) {
  container.textContent = "";
  const featuredEntry = entries.find((entry) => entry.featured) || entries[0];
  container.appendChild(createFeaturedCard(featuredEntry, siteBaseUrl));
}

async function renderCollectionsFromIndex() {
  const body = document.body;
  const indexPath = body.dataset.contentIndexUrl;
  if (!indexPath) {
    return;
  }

  const siteRoot = body.dataset.siteRoot || "./";
  const siteBaseUrl = resolveUrl(siteRoot, window.location.href);
  const contentIndex = await fetchJson(resolveUrl(indexPath, window.location.href));

  for (const container of document.querySelectorAll("[data-render][data-collection]")) {
    const collectionName = container.dataset.collection;
    const renderType = container.dataset.render;
    const entries = getCollectionEntries(contentIndex, collectionName, container);

    if (renderType === "featured") {
      renderFeaturedCollection(container, entries, siteBaseUrl);
      continue;
    }

    renderListCollection(container, entries, siteBaseUrl);
  }
}

function setManifestText(field, value) {
  for (const node of document.querySelectorAll(`[data-manifest-field="${field}"]`)) {
    node.textContent = value;
  }
}

function setManifestDownloadLinks(manifest, baseUrl) {
  if (!manifest.release_url) {
    return;
  }

  for (const anchor of document.querySelectorAll("[data-manifest-download]")) {
    setSafeHref(anchor, manifest.release_url, baseUrl);
    if (/^https?:\/\//i.test(anchor.href)) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }
  }
}

async function loadManifestPanels() {
  const body = document.body;
  const manifestPath = body.dataset.manifestUrl;
  if (!manifestPath) {
    return;
  }

  const manifestUrl = resolveUrl(manifestPath, window.location.href);
  const manifest = await fetchJson(manifestUrl);
  setManifestText("version", manifest.latest_version || manifest.version || "미정");
  setManifestText("published_at", manifest.published_at || "배포 시각 정보 없음");
  setManifestDownloadLinks(manifest, manifestUrl);

  const notesPath = manifest.notes_url || "./release-notes.txt";
  const notesText = await fetchText(resolveUrl(notesPath, manifestUrl));
  for (const node of document.querySelectorAll("[data-release-notes]")) {
    node.textContent = notesText.trim() || "릴리스 노트가 비어 있습니다.";
  }
}

function renderManifestError(error) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류";
  setManifestText("version", "확인 필요");
  setManifestText("published_at", message);

  for (const node of document.querySelectorAll("[data-release-notes]")) {
    node.textContent =
      "배포 파일 또는 manifest.json 이 아직 준비되지 않았습니다.\n\n" +
      "1. 프로젝트 배포 스크립트 실행\n" +
      "2. docs/downloads/naverworks-hr-extractor 파일 생성 확인\n" +
      "3. GitHub Pages 재배포";
  }
}

Promise.all([
  renderCollectionsFromIndex().catch(() => {}),
  loadManifestPanels().catch(renderManifestError),
]).catch(() => {});
