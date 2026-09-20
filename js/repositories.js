import { REPOSITORIES_PER_VIEW, REPOSITORY_API_PAGE_SIZE } from './config.js';

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

const hasNextLink = (linkHeader) => typeof linkHeader === 'string'
  && linkHeader.split(',').some((link) => /;\s*rel="?next"?\s*$/.test(link.trim()));

const repositoryKey = (repository) => {
  if (Number.isFinite(repository?.id)) {
    return `id:${repository.id}`;
  }
  return `fallback:${repository?.html_url ?? ''}:${repository?.name ?? ''}`;
};

export const createRepositoriesController = ({
  username, status, grid, retry, filter, pagination, previousPage, nextPage, pageStatus, onSettled,
}) => {
  if (!status || !grid || !retry) {
    onSettled?.();
    return { load: () => Promise.resolve() };
  }
  let initialRequestSettled = false;
  let state = {
    phase: 'idle', repositories: [], message: '', filter: ALL_LANGUAGES,
    apiPage: 0, hasNextApiPage: false, uiPage: 1,
  };

  const settleInitialRequest = () => {
    if (!initialRequestSettled) {
      initialRequestSettled = true;
      onSettled?.();
    }
  };

  const filteredRepositories = () => state.filter === ALL_LANGUAGES
    ? state.repositories
    : state.repositories.filter((repository) => repositoryLanguageKey(repository) === state.filter);

  const renderFilter = () => {
    if (!filter) {
      return;
    }
    const options = state.repositories.length > 0
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
    filter.disabled = state.repositories.length === 0
      || state.phase === 'loading-initial'
      || state.phase === 'loading-more';
  };

  const renderPagination = (repositories) => {
    if (!pagination || !previousPage || !nextPage || !pageStatus) {
      return;
    }
    const totalPages = Math.max(1, Math.ceil(repositories.length / REPOSITORIES_PER_VIEW));
    const hasLocalNextPage = state.uiPage < totalPages;
    const loading = state.phase === 'loading-more';
    pagination.hidden = state.repositories.length === 0;
    previousPage.disabled = loading || state.uiPage <= 1;
    nextPage.disabled = loading || (!hasLocalNextPage && !state.hasNextApiPage);
    nextPage.textContent = loading ? '불러오는 중…' : hasLocalNextPage ? '다음' : '더 불러오기';
    pageStatus.textContent = `${state.uiPage} / ${totalPages}`;
  };

  const render = () => {
    grid.replaceChildren();
    retry.hidden = state.phase !== 'error-initial' && state.phase !== 'error-more';
    renderFilter();
    const statusMessages = {
      idle: 'GitHub 계정 정보가 아직 준비되지 않았습니다. 설정 후 공개 저장소가 이곳에 표시됩니다.',
      'loading-initial': '공개 저장소를 불러오는 중입니다…',
      empty: '표시할 공개 저장소가 없습니다.',
      'error-initial': `공개 저장소를 불러오지 못했습니다. ${state.message}`,
    };
    if (statusMessages[state.phase]) {
      status.textContent = statusMessages[state.phase];
    }
    if (state.repositories.length === 0) {
      if (pagination) {
        pagination.hidden = true;
      }
      return;
    }
    const matchingRepositories = filteredRepositories();
    const totalPages = Math.max(1, Math.ceil(matchingRepositories.length / REPOSITORIES_PER_VIEW));
    state.uiPage = Math.min(state.uiPage, totalPages);
    const start = (state.uiPage - 1) * REPOSITORIES_PER_VIEW;
    const visibleRepositories = matchingRepositories.slice(start, start + REPOSITORIES_PER_VIEW);

    if (state.phase === 'loading-more') {
      status.textContent = `저장소를 더 불러오는 중입니다… 현재 ${state.repositories.length}개를 불러왔습니다.`;
    } else if (state.phase === 'error-more') {
      status.textContent = `추가 저장소를 불러오지 못했습니다. 현재 불러온 ${state.repositories.length}개는 계속 볼 수 있습니다. ${state.message}`;
    } else if (matchingRepositories.length === 0) {
      status.textContent = state.hasNextApiPage
        ? `불러온 저장소 ${state.repositories.length}개에는 선택한 언어의 저장소가 없습니다. 더 불러올 수 있습니다.`
        : `불러온 저장소 ${state.repositories.length}개에는 선택한 언어의 저장소가 없습니다.`;
    } else if (state.filter === ALL_LANGUAGES) {
      const end = Math.min(start + visibleRepositories.length, matchingRepositories.length);
      status.textContent = `최근 업데이트 순으로 저장소 ${state.repositories.length}개를 불러왔습니다. ${start + 1}–${end}번째를 표시합니다.`;
    } else {
      status.textContent = `불러온 저장소 ${state.repositories.length}개 중 선택한 언어의 저장소 ${matchingRepositories.length}개를 표시합니다.`;
    }
    if (visibleRepositories.length === 0) {
      renderPagination(matchingRepositories);
      return;
    }
    grid.append(...visibleRepositories.map(createRepositoryCard));
    renderPagination(matchingRepositories);
  };

  const requestApiPage = async (page, advanceUiPage = false) => {
    if (state.phase === 'loading-initial' || state.phase === 'loading-more') {
      return;
    }
    const initialLoad = page === 1 && state.repositories.length === 0;
    const previousTotalPages = Math.max(1, Math.ceil(filteredRepositories().length / REPOSITORIES_PER_VIEW));
    state.phase = initialLoad ? 'loading-initial' : 'loading-more';
    state.message = '';
    render();
    try {
      const endpoint = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=${REPOSITORY_API_PAGE_SIZE}&page=${page}`;
      const response = await fetch(endpoint, { headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (!Array.isArray(payload)) {
        throw new Error('응답 형식 오류');
      }
      const knownKeys = new Set(state.repositories.map(repositoryKey));
      const newRepositories = payload.filter((repository) => {
        const key = repositoryKey(repository);
        if (knownKeys.has(key)) {
          return false;
        }
        knownKeys.add(key);
        return true;
      });
      state.repositories.push(...newRepositories);
      state.apiPage = page;
      const linkHeader = response.headers?.get?.('Link') ?? '';
      state.hasNextApiPage = linkHeader
        ? hasNextLink(linkHeader)
        : payload.length === REPOSITORY_API_PAGE_SIZE;
      if (state.repositories.length === 0) {
        state.phase = 'empty';
        state.filter = ALL_LANGUAGES;
      } else {
        state.phase = 'ready';
        const nextTotalPages = Math.max(1, Math.ceil(filteredRepositories().length / REPOSITORIES_PER_VIEW));
        if (advanceUiPage && state.uiPage >= previousTotalPages && nextTotalPages > state.uiPage) {
          state.uiPage += 1;
        }
      }
    } catch (error) {
      state.phase = initialLoad ? 'error-initial' : 'error-more';
      state.message = error instanceof Error ? error.message : '네트워크 오류';
    }
    render();
    if (initialLoad) {
      settleInitialRequest();
    }
  };

  const load = async () => {
    if (!username) {
      state.phase = 'idle';
      render();
      settleInitialRequest();
      return;
    }
    if (state.repositories.length === 0) {
      await requestApiPage(1);
    }
  };

  render();
  retry.addEventListener('click', () => {
    if (state.phase === 'error-more') {
      requestApiPage(state.apiPage + 1, true);
    } else {
      requestApiPage(1);
    }
  });
  filter?.addEventListener('change', () => {
    state.filter = filter.value;
    state.uiPage = 1;
    render();
  });
  previousPage?.addEventListener('click', () => {
    if (state.phase !== 'loading-more' && state.uiPage > 1) {
      state.uiPage -= 1;
      render();
    }
  });
  nextPage?.addEventListener('click', () => {
    if (state.phase === 'loading-more') {
      return;
    }
    const totalPages = Math.max(1, Math.ceil(filteredRepositories().length / REPOSITORIES_PER_VIEW));
    if (state.uiPage < totalPages) {
      state.uiPage += 1;
      render();
    } else if (state.hasNextApiPage) {
      requestApiPage(state.apiPage + 1, true);
    }
  });
  return { load };
};
