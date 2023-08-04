import {Effect} from '..';
import {APP_ANALYTICS_ENABLED} from '../../constants/config';
import {BrazeUserAttributes, BrazeWrapper} from '../../lib/Braze';
import {LogActions} from '../log';

export const Analytics = (() => {
  let _preInitQueue: Array<() => void> = [];
  let _isInitialized = false;

  const guard = (cb: () => void) => {
    if (!APP_ANALYTICS_ENABLED) {
      return;
    }

    if (!_isInitialized) {
      // Queue up any actions that happen before we get a chance to initialize.
      _preInitQueue.push(cb);
      return;
    }

    cb();
  };

  return {
    /**
     * Initialize the analytics SDK(s) before use.
     *
     * @returns Promise<void>
     */
    initialize: (): Effect<Promise<void>> => async (dispatch) => {
      if (_isInitialized) {
        return;
      }

      if (!APP_ANALYTICS_ENABLED) {
        _isInitialized = true;
        return;
      }

      _isInitialized = true;
      dispatch(LogActions.info('Successfully initialized analytics.'));

      return Promise.resolve();
    },

    /**
     * Makes a call to identify a user through the analytics SDK.
     *
     * @param user BitPay EID for this user.
     * @param traits An object of known user attributes. Things like: email, name, plan, etc.
     * @param onComplete A function to run once the identify event has been successfully sent.
     */
    identify:
      (
        user: string | undefined,
        traits?: BrazeUserAttributes | undefined,
        onComplete?: () => void,
      ): Effect<void> =>
      () => {
        guard(async () => {
          BrazeWrapper.identify(user, traits);
          onComplete?.();
        });
      },

    /**
     * Send an event through the analytics SDK when a screen has been viewed.
     *
     * @param name The name of the screen being viewed.
     * @param properties An object of properties for the screen view event.
     * @param onComplete A function to run once the screen event has been successfully sent.
     */
    screen:
      (
        name: string,
        properties: Record<string, any> = {},
        onComplete?: () => void,
      ): Effect<any> =>
      () => {
        guard(async () => {
          BrazeWrapper.screen(name, properties);
          onComplete?.();
        });
      },

    /**
     * Send an event through the analytics SDK when the user has performed an action.
     *
     * @param event The name of the event you're tracking. Recommended to use human-readable names like `Played a Song` or `Updated Status`.
     * @param properties An object of event properties. If the event was 'Added to Shopping Cart', it might have properties like price, productType, etc.
     * @param onComplete A function to run once the tracking event has been successfully sent.
     */
    track:
      (
        event: string,
        properties: Record<string, any> = {},
        onComplete?: () => void,
      ): Effect<void> =>
      () => {
        guard(async () => {
          const eventName = `BitPay App - ${event}`;

          BrazeWrapper.track(eventName, properties);
          onComplete?.();
        });
      },
  };
})();
