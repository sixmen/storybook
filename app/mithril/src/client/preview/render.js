/* global document */
/** @jsx m */

import m from 'mithril';
import { stripIndents } from 'common-tags';
import { logger } from '@storybook/client-logger';
import ErrorDisplay from './error_display';

// check whether we're running on node/browser
const isBrowser = typeof window !== 'undefined';

let rootEl = null;
let previousKind = '';
let previousStory = '';

if (isBrowser) {
  rootEl = document.getElementById('root');
}

export function renderError(error) {
  const properError = new Error(error.title);
  properError.stack = error.description;

  const redBox = <ErrorDisplay error={properError} />;
  m.mount(rootEl, { view: () => redBox });
}

export function renderException(error) {
  // We always need to render redbox in the mainPage if we get an error.
  // Since this is an error, this affects to the main page as well.
  const realError = new Error(error.message);
  realError.stack = error.stack;
  const redBox = <ErrorDisplay error={realError} />;
  m.mount(rootEl, { view: () => redBox });

  // Log the stack to the console. So, user could check the source code.
  logger.error(error.stack);
}

export function renderMain(data, storyStore) {
  if (storyStore.size() === 0) return null;

  const NoPreview = { view: () => <p>No Preview Available!</p> };
  const noPreview = <NoPreview />;
  const { selectedKind, selectedStory } = data;

  const story = storyStore.getStory(selectedKind, selectedStory);
  if (!story) {
    m.mount(rootEl, { view: () => noPreview });
    return null;
  }

  if (selectedKind === previousKind && previousStory === selectedStory) {
    return null;
  }

  previousKind = selectedKind;
  previousStory = selectedStory;

  const context = {
    kind: selectedKind,
    story: selectedStory,
  };

  const element = story(context);

  if (!element) {
    const error = {
      title: `Expecting a Mithril element from the story: "${selectedStory}" of "${selectedKind}".`,
      description: stripIndents`
        Did you forget to return the Mithril element from the story?
        Use "() => MyComp" or "() => { return MyComp; }" when defining the story.
      `,
    };
    return renderError(error);
  }

  m.mount(rootEl, { view: () => m(element) });
  return null;
}

export default function renderPreview({ reduxStore, storyStore }) {
  const state = reduxStore.getState();
  if (state.error) {
    return renderException(state.error);
  }

  try {
    return renderMain(state, storyStore);
  } catch (ex) {
    return renderException(ex);
  }
}
