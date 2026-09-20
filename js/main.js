'use strict';

import { initializeContactForm } from './contact.js';
import { initializeHeroTyping } from './hero-typing.js';
import { createNavigationController } from './navigation.js';
import { createRepositoriesController } from './repositories.js';
import { initializeTextareaResize } from './textarea-resize.js';
import { createThemeController } from './theme.js';

document.documentElement.classList.add('js');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const navigation = createNavigationController({
  header: document.querySelector('.site-header'),
  menuToggle: document.querySelector('.menu-toggle'),
  primaryNav: document.querySelector('.primary-nav'),
  topButton: document.querySelector('.top-button'),
  reducedMotion,
});

createThemeController({
  toggle: document.querySelector('.theme-toggle'),
  systemTheme: window.matchMedia('(prefers-color-scheme: dark)'),
});
initializeHeroTyping({
  container: document.querySelector('.hero-description'),
  staticText: document.querySelector('.hero-description-static'),
  typingText: document.querySelector('.hero-description-typing'),
  reducedMotion,
});
initializeContactForm({ form: document.querySelector('.contact-form'), result: document.querySelector('.form-result') });
initializeTextareaResize({
  textarea: document.querySelector('#contact-message'),
  corner: document.querySelector('.textarea-resize-corner'),
});

const projectsSection = document.querySelector('#projects');
const repositories = createRepositoriesController({
  username: projectsSection?.dataset.githubUsername?.trim() ?? '',
  status: document.querySelector('.github-status'),
  grid: document.querySelector('.repo-grid'),
  retry: document.querySelector('.retry-button'),
  filter: document.querySelector('#repository-language-filter'),
  onSettled: navigation.completeInitialHashCorrection,
});
repositories.load();
