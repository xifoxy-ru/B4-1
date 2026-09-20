import { REPOSITORY_LIMIT } from './config.js';

const ALL_LANGUAGES = 'all';
const NO_LANGUAGE = 'none';

export const safeRepositoryUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'github.com' ? url.href : null;
  } catch {
    return null;
  }
};

export const repositoryLanguageKey = ({ language }) => {
  const normalizedLanguage = typeof language === 'string' ? language.trim() : '';
  return normalizedLanguage ? `language:${normalizedLanguage}` : NO_LANGUAGE;
};

export const repositoryLanguageOptions = (repositories) => {
  const namedLanguages = [...new Set(repositories
    .map(({ language }) => typeof language === 'string' ? language.trim() : '')
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'ko'));
  const options = namedLanguages.map((language) => ({ value: `language:${language}`, label: language }));
  if (repositories.some((repository) => repositoryLanguageKey(repository) === NO_LANGUAGE)) {
    options.push({ value: NO_LANGUAGE, label: '언어 미지정' });
  }
  return [{ value: ALL_LANGUAGES, label: '전체' }, ...options];
};

const createRepositoryCard = (repository) => {
  const { name, description, html_url: repositoryUrl, language } = repository;
  const article = document.createElement('article');
  const title = document.createElement('h4');
  const summary = document.createElement('p');
  const meta = document.createElement('p');
  const safeUrl = safeRepositoryUrl(repositoryUrl);
  article.className = 'repo-card';
  title.textContent = typeof name === 'string' && name.trim() ? name : '이름 없는 저장소';
  summary.textContent = typeof description === 'string' && description.trim() ? description : '설명이 없습니다.';
  meta.className = 'repo-meta';
  meta.textContent = `주요 언어: ${typeof language === 'string' && language.trim() ? language : '미지정'}`;
  article.append(title, summary, meta);
  if (safeUrl) {
    const link = document.createElement('a');
    link.href = safeUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'GitHub에서 보기';
    article.append(link);
  }
  return article;
};

export const createRepositoriesController = ({ username, status, grid, retry, filter, onSettled }) => {
  if (!status || !grid || !retry) {
    onSettled();
    return { load: () => Promise.resolve() };
  }
  let requestId = 0;
  let state = { status: 'idle', repositories: [], message: '', filter: ALL_LANGUAGES };

  const renderFilter = () => {
    if (!filter) {
      return;
    }
    if (state.status === 'loading' || state.status === 'error') {
      filter.disabled = true;
      return;
    }
    const options = state.status === 'success'
      ? repositoryLanguageOptions(state.repositories)
      : [{ value: ALL_LANGUAGES, label: '전체' }];
    if (!options.some(({ value }) => value === state.filter)) {
      state.filter = ALL_LANGUAGES;
    }
    filter.replaceChildren(...options.map(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      return option;
    }));
    filter.value = state.filter;
    filter.disabled = state.status !== 'success';
  };

  const render = () => {
    grid.replaceChildren();
    retry.hidden = state.status !== 'error';
    renderFilter();
    const statusMessages = {
      idle: 'GitHub 계정 정보가 아직 준비되지 않았습니다. 설정 후 공개 저장소가 이곳에 표시됩니다.',
      loading: '공개 저장소를 불러오는 중입니다…',
      empty: '표시할 공개 저장소가 없습니다.',
      error: `공개 저장소를 불러오지 못했습니다. ${state.message}`,
      success: `최근 업데이트 순으로 공개 저장소 ${state.repositories.length}개를 표시합니다. 최대 100개까지 요청합니다.`,
    };
    status.textContent = statusMessages[state.status];
    if (state.status !== 'success') {
      return;
    }
    const filteredRepositories = state.filter === ALL_LANGUAGES
      ? state.repositories
      : state.repositories.filter((repository) => repositoryLanguageKey(repository) === state.filter);
    if (filteredRepositories.length === 0) {
      status.textContent = '선택한 언어에 해당하는 저장소가 없습니다.';
      return;
    }
    if (state.filter !== ALL_LANGUAGES) {
      status.textContent = `공개 저장소 ${state.repositories.length}개 중 ${filteredRepositories.length}개를 표시합니다.`;
    }
    grid.append(...filteredRepositories.map(createRepositoryCard));
  };

  const load = async () => {
    if (!username) {
      state = { status: 'idle', repositories: [], message: '', filter: ALL_LANGUAGES };
      render();
      onSettled();
      return;
    }
    const activeRequestId = ++requestId;
    state = { status: 'loading', repositories: [], message: '', filter: state.filter };
    render();
    try {
      const endpoint = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=${REPOSITORY_LIMIT}`;
      const response = await fetch(endpoint, { headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (!Array.isArray(payload)) {
        throw new Error('응답 형식 오류');
      }
      if (activeRequestId !== requestId) {
        return;
      }
      state = payload.length === 0
        ? { status: 'empty', repositories: [], message: '', filter: ALL_LANGUAGES }
        : { status: 'success', repositories: payload.slice(0, REPOSITORY_LIMIT), message: '', filter: state.filter };
    } catch (error) {
      if (activeRequestId !== requestId) {
        return;
      }
      state = {
        status: 'error', repositories: [],
        message: error instanceof Error ? error.message : '네트워크 오류', filter: state.filter,
      };
    }
    render();
    onSettled();
  };

  render();
  retry.addEventListener('click', load);
  filter?.addEventListener('change', () => {
    state.filter = filter.value;
    render();
  });
  return { load };
};
