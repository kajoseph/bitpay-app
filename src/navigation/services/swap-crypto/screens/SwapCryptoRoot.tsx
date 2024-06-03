import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useTheme, useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import _ from 'lodash';
import cloneDeep from 'lodash.clonedeep';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
  SUPPORTED_COINS,
  SUPPORTED_ETHEREUM_TOKENS,
  SUPPORTED_EVM_COINS,
  SUPPORTED_TOKENS,
} from '../../../../constants/currencies';
import {
  Action,
  SlateDark,
  White,
  ProgressBlue,
  Black,
} from '../../../../styles/colors';
import {
  CtaContainer,
  SwapCryptoCard,
  SummaryTitle,
  ArrowContainer,
  SelectorArrowContainer,
  ActionsContainer,
  SelectedOptionContainer,
  SelectedOptionText,
  SelectedOptionCol,
  CoinIconContainer,
  DataText,
  BottomDataText,
  ProviderContainer,
  ProviderLabel,
  SpinnerContainer,
  BalanceContainer,
} from '../styled/SwapCryptoRoot.styled';
import {SwapCryptoGroupParamList, SwapCryptoScreens} from '../SwapCryptoGroup';
import Button from '../../../../components/button/Button';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import FromWalletSelectorModal from '../components/FromWalletSelectorModal';
import ToWalletSelectorModal from '../../components/ToWalletSelectorModal';
import AmountModal from '../../../../components/amount/AmountModal';
import {WalletRowProps} from '../../../../components/list/WalletRow';
import {
  changellyGetPairsParams,
  getChangellyCurrenciesFixedProps,
  getChangellyFixedCurrencyAbbreviation,
  getChangellySupportedChains,
  getChainFromChangellyBlockchain,
} from '../utils/changelly-utils';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {
  getBadgeImg,
  getChainFromTokenByAddressKey,
  getCurrencyAbbreviation,
  addTokenChainSuffix,
  sleep,
} from '../../../../utils/helper-methods';
import {useLogger} from '../../../../utils/hooks/useLogger';
import {IsERCToken} from '../../../../store/wallet/utils/currency';
import {getFeeRatePerKb} from '../../../../store/wallet/effects/fee/fee';
import {Wallet, SendMaxInfo} from '../../../../store/wallet/wallet.models';
import {changellyGetCurrencies} from '../../../../store/swap-crypto/effects/changelly/changelly';
import {
  startOnGoingProcessModal,
  openUrlWithInAppBrowser,
} from '../../../../store/app/app.effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../store/app/app.actions';
import ArrowDown from '../../../../../assets/img/services/swap-crypto/down-arrow.svg';
import SelectorArrowDown from '../../../../../assets/img/selector-arrow-down.svg';
import InfoSvg from '../../../../../assets/img/info.svg';
import {AppActions} from '../../../../store/app';
import {useTranslation} from 'react-i18next';
import {getSendMaxInfo} from '../../../../store/wallet/effects/send/send';
import {SatToUnit} from '../../../../store/wallet/effects/amount/amount';
import {orderBy} from 'lodash';
import {
  addWallet,
  AddWalletData,
  getDecryptPassword,
} from '../../../../store/wallet/effects/create/create';
import {WrongPasswordError} from '../../../wallet/components/ErrorMessages';
import {startUpdateWalletStatus} from '../../../../store/wallet/effects/status/status';
import SwapCryptoLoadingWalletSkeleton from './SwapCryptoLoadingWalletSkeleton';
import SwapCryptoBalanceSkeleton from './SwapCryptoBalanceSkeleton';
import BalanceDetailsModal from '../../../wallet/components/BalanceDetailsModal';
import {buildUIFormattedWallet} from '../../../wallet/screens/KeyOverview';
import {
  ExternalServicesConfig,
  ExternalServicesConfigRequestParams,
  SwapCryptoConfig,
} from '../../../../store/external-services/external-services.types';
import {getExternalServicesConfig} from '../../../../store/external-services/external-services.effects';
import {StackActions} from '@react-navigation/native';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import styled from 'styled-components/native';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import GlobalSelect from '../../../wallet/screens/GlobalSelect';
import {getExternalServiceSymbol} from '../../utils/external-services-utils';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { ChangellyCurrency, ChangellyCurrencyBlockchain } from '../../../../store/swap-crypto/models/changelly.models';
import {thorswapGetCurrencies} from '../../../../store/swap-crypto/effects/thorswap/thorswap';
import {
  getThorswapCurrenciesFixedProps,
  thorswapEnv,
} from '../utils/thorswap-utils';
import {
  ChangellyRateData,
} from '../../../../store/swap-crypto/models/changelly.models';
import {
  ThorswapCurrency,
  ThorswapGetCurrenciesRequestData,
} from '../../../../store/swap-crypto/models/thorswap.models';
import {SwapCryptoExchangeKey} from '../utils/swap-crypto-utils';
import {SwapCryptoLimits} from '../../../../store/swap-crypto/swap-crypto.models';

export type SwapCryptoRootScreenParams =
  | {
      selectedWallet?: Wallet;
      partner?: SwapCryptoExchangeKey;
    }
  | undefined;

export interface SwapLimits {
  minAmount?: number;
  maxAmount?: number;
}

export interface SwapCryptoCoin {
  currencyAbbreviation: string;
  symbol: string;
  chain: string;
  name: string;
  protocol?: string;
  logoUri?: any;
  badgeUri?: any;
  tokenAddress?: string;
  supportedBy?: {
    changelly?: boolean;
    thorswap?: boolean;
  };
}

export interface SwapCryptoExchange {
  key: SwapCryptoExchangeKey;
  showOffer: boolean;
  supportedCoins: SwapCryptoCoin[] | undefined;
  disabled: boolean; // The offer card is shown but with an error message
  offerError: string | undefined;
  limits?: SwapCryptoLimits;
}

export type PreLoadPartnersData = {
  [key in SwapCryptoExchangeKey]: SwapCryptoExchange;
};

const swapCryptoExchangesDefault: PreLoadPartnersData = {
  changelly: {
    key: 'changelly',
    showOffer: true,
    supportedCoins: undefined,
    disabled: false,
    offerError: undefined,
    limits: {
      min: undefined,
      max: undefined,
    },
  },
  thorswap: {
    key: 'thorswap',
    showOffer: true,
    supportedCoins: undefined,
    disabled: false,
    offerError: undefined,
    limits: undefined,
  },
};

const SwapCryptoContainer = styled.SafeAreaView`
  flex: 1;
`;

const GlobalSelectContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

let swapCryptoConfig: SwapCryptoConfig | undefined;

const SwapCryptoRoot: React.FC = () => {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const insets = useSafeAreaInsets();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const tokenDataByAddress = useAppSelector(
    ({WALLET}) => WALLET.tokenDataByAddress,
  );
  const tokenOptionsByAddress = useAppSelector(
    ({WALLET}) => WALLET.tokenOptionsByAddress,
  );
  const tokenOptions = Object.entries(tokenOptionsByAddress).map(
    ([k, {symbol}]) => {
      const chain = getChainFromTokenByAddressKey(k);
      return getCurrencyAbbreviation(symbol.toLowerCase(), chain);
    },
  );
  const {rates} = useAppSelector(({RATE}) => RATE);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const route =
    useRoute<RouteProp<SwapCryptoGroupParamList, 'SwapCryptoRoot'>>();
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [fromWalletSelectorModalVisible, setFromWalletSelectorModalVisible] =
    useState(false);
  const [toWalletSelectorModalVisible, setToWalletSelectorModalVisible] =
    useState(false);
  const [balanceDetailsModalVisible, setBalanceDetailsModalVisible] =
    useState<boolean>(false);
  const [fromWalletSelected, setFromWalletSelected] = useState<Wallet>();
  const [uiFormattedWallet, setUiFormattedWallet] = useState<WalletRowProps>();
  const [useDefaultToWallet, setUseDefaultToWallet] = useState<boolean>(false);
  const [toWalletSelected, setToWalletSelected] = useState<Wallet>();
  const [amountFrom, setAmountFrom] = useState<number>(0);
  const [swapCryptoSupportedCoinsFrom, setSwapCryptoSupportedCoinsFrom] =
    useState<SwapCryptoCoin[]>();
  const [swapCryptoSupportedCoinsTo, setSwapCryptoSupportedCoinsTo] = useState<
    SwapCryptoCoin[]
  >([]);
  const [rateData, setRateData] = useState<ChangellyRateData>();
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingEnterAmountBtn, setLoadingEnterAmountBtn] =
    useState<boolean>(false);
  const [loadingWalletFromStatus, setLoadingWalletFromStatus] =
    useState<boolean>(false);
  const [useSendMax, setUseSendMax] = useState<boolean>(false);
  const [sendMaxInfo, setSendMaxInfo] = useState<SendMaxInfo | undefined>();

  let selectedWallet = route.params?.selectedWallet;
  const allSupportedTokens: string[] = [...tokenOptions, ...SUPPORTED_TOKENS];
  const preSetPartner = route.params?.partner?.toLowerCase() as
    | SwapCryptoExchangeKey
    | undefined;
  const SupportedEthereumTokens: string[] = SUPPORTED_ETHEREUM_TOKENS;
  const SupportedChains: string[] = SUPPORTED_COINS;
  const [swapLimits, setSwapLimits] = useState<SwapLimits>({
    minAmount: undefined,
    maxAmount: undefined,
  });

  const showModal = (id: string) => {
    switch (id) {
      case 'fromWalletSelector':
        setFromWalletSelectorModalVisible(true);
        break;
      case 'toWalletSelector':
        setToWalletSelectorModalVisible(true);
        break;
      case 'amount':
        setAmountModalVisible(true);
        break;
      default:
        break;
    }
  };

  const hideModal = (id: string) => {
    switch (id) {
      case 'fromWalletSelector':
        setFromWalletSelectorModalVisible(false);
        break;
      case 'toWalletSelector':
        setToWalletSelectorModalVisible(false);
        break;
      case 'amount':
        setAmountModalVisible(false);
        break;
      default:
        break;
    }
  };

  const canContinue = (): boolean => {
    return (
      !!toWalletSelected && !!fromWalletSelected && amountFrom > 0
      // !!rateData &&
      // !!rateData.fixedRateId
    );
  };

  const setSelectedWallet = async () => {
    if (selectedWallet) {
      const key = keys[selectedWallet.keyId];
      try {
        await dispatch(
          startUpdateWalletStatus({key, wallet: selectedWallet, force: true}),
        );
      } catch (err) {
        logger.warn('Failed to update balances from Swap Crypto');
      }
      if (selectedWallet.balance?.satSpendable > 0) {
        setFromWallet(selectedWallet, true);
      } else if (selectedWallet.balance?.satSpendable === 0) {
        setToWallet(selectedWallet);
        setUseDefaultToWallet(true);
      } else {
        logger.warn('It was not possible to set the selected wallet');
      }
    }
    dispatch(dismissOnGoingProcessModal());
  };

  const setFromWallet = async (
    fromWallet: Wallet,
    skipStatusUpdate?: boolean,
  ) => {
    if (!swapCryptoSupportedCoinsFrom) {
      return;
    }
    if (!useDefaultToWallet) {
      setToWalletSelected(undefined);
    }

    if (!skipStatusUpdate) {
      setLoadingWalletFromStatus(true);

      const key = keys[fromWallet.keyId];
      try {
        await dispatch(
          startUpdateWalletStatus({key, wallet: fromWallet, force: true}),
        );
      } catch (err) {
        logger.warn('Failed to update balances from Swap Crypto');
      }
    }

    setAmountFrom(0);
    setUseSendMax(false);
    setSendMaxInfo(undefined);
    setLoading(false);
    setLoadingEnterAmountBtn(false);
    setRateData(undefined);

    let possibleCoinsTo: SwapCryptoCoin[] = [];

    // Only include possible pairs in coinsTo.
    // Do not show exchange offer if coinFrom is not supported.
    Object.values(swapCryptoExchangesDefault).forEach(exchange => {
      if (exchange.supportedCoins && exchange.supportedCoins.length > 0) {
        const isCoinPresentedInExchange = exchange.supportedCoins.find(
          coin =>
            coin.symbol ===
            getCurrencyAbbreviation(
              fromWallet.currencyAbbreviation,
              fromWallet.chain,
            ),
        );

        if (exchange.showOffer && isCoinPresentedInExchange) {
          possibleCoinsTo = possibleCoinsTo.concat(exchange.supportedCoins);
          swapCryptoExchangesDefault[exchange.key].showOffer = true;
        } else {
          swapCryptoExchangesDefault[exchange.key].showOffer = false;
        }
      }
    });

    possibleCoinsTo = _.uniqBy(possibleCoinsTo, 'symbol');

    // Remove coinsFrom from possible coinsTo
    const coinsTo = cloneDeep(possibleCoinsTo).filter(
      coin =>
        SUPPORTED_EVM_COINS.includes(coin.chain) ||
        (!SUPPORTED_EVM_COINS.includes(coin.chain) &&
          coin.symbol !==
            getExternalServiceSymbol(
              fromWallet.currencyAbbreviation,
              fromWallet.chain,
            )),
    );

    setSwapCryptoSupportedCoinsTo(coinsTo);
    setFromWalletSelected(fromWallet);
    setLoadingWalletFromStatus(false);
  };

  const setToWallet = (toWallet: Wallet) => {
    setRateData(undefined);
    setToWalletSelected(toWallet);
  };

  const isToWalletEnabled = (): boolean => {
    return !!fromWalletSelected;
  };

  const swapGetLimits = async () => {
    setLoadingEnterAmountBtn(true);
    setRateData(undefined);
    if (!fromWalletSelected || !toWalletSelected) {
      return;
    }

    const pair =
      getCurrencyAbbreviation(
        fromWalletSelected.currencyAbbreviation,
        fromWalletSelected.chain,
      ) +
      '_' +
      getCurrencyAbbreviation(
        toWalletSelected.currencyAbbreviation,
        toWalletSelected.chain,
      );
    logger.debug('Updating max and min with pair: ' + pair);

    // let getLimitsPromises = [];
    // if (swapCryptoExchangesDefault.changelly.showOffer && swapCryptoExchangesDefault.changelly.supportedCoins && swapCryptoExchangesDefault.changelly.supportedCoins.length > 0) {
    //   getLimitsPromises.push(changellyGetLimits(fromWalletSelected, toWalletSelected));
    // }

    // if (swapCryptoExchangesDefault.thorswap.showOffer && swapCryptoExchangesDefault.thorswap.supportedCoins && swapCryptoExchangesDefault.thorswap.supportedCoins.length > 0) {
    //   getLimitsPromises.push(thorswapGetLimits(fromWalletSelected, toWalletSelected));
    // }

    // getLimitsPromises.push(sleep(400));

    const enabledExchanges = Object.values(swapCryptoExchangesDefault)
      .filter(
        exchange =>
          exchange.showOffer &&
          !exchange.disabled &&
          exchange.supportedCoins &&
          exchange.supportedCoins.length > 0,
      )
      .map(exchange => exchange.key);

    const getLimitsPromiseByExchange = (exchange: SwapCryptoExchangeKey) => {
      switch (exchange) {
        case 'changelly':
          return changellyGetLimits(fromWalletSelected, toWalletSelected);
        case 'thorswap':
          return thorswapGetLimits();
        default:
          return Promise.reject('No getLimits function for this partner');
      }
    };

    const getLimitsPromises = enabledExchanges.map(exchange =>
      getLimitsPromiseByExchange(exchange),
    );

    try {
      const responseByExchange = await Promise.allSettled([
        ...getLimitsPromises,
        sleep(400),
      ]);
      const responseByExchangeKey = responseByExchange.map((res, index) => {
        const exchangeKey: SwapCryptoExchangeKey | undefined =
          enabledExchanges[index] ?? undefined;
        return {exchangeKey, promiseRes: res};
      });

      // const responseByExchange = await Promise.allSettled(getLimitsPromises);
      // const responseByExchangeKey = responseByExchange.map((res, index) => {
      //   const exchange = exchanges[index];
      //   return { exchange, res };
      // });

      let allLimits: SwapLimits[] = [];

      if (responseByExchangeKey instanceof Array) {
        responseByExchangeKey.forEach((e, index) => {
          if (e.promiseRes.status === 'rejected') {
            logger.debug(
              `Swap crypto getLimits[${
                e.exchangeKey
              }] Rejected: + ${JSON.stringify(e.promiseRes.reason)}`,
            );
          } else if (e.promiseRes.status === 'fulfilled') {
            switch (e.exchangeKey) {
              case 'changelly':
                swapCryptoExchangesDefault.changelly.limits = {
                  min: e.promiseRes.value?.minAmount
                    ? Number(e.promiseRes.value.minAmount)
                    : undefined,
                  max: e.promiseRes.value?.maxAmount
                    ? Number(e.promiseRes.value.maxAmount)
                    : undefined,
                };
                allLimits.push(e.promiseRes.value as SwapLimits);
                break;
              case 'thorswap':
                swapCryptoExchangesDefault.thorswap.limits = {
                  min: e.promiseRes.value?.minAmount
                    ? Number(e.promiseRes.value.minAmount)
                    : undefined,
                  max: e.promiseRes.value?.maxAmount
                    ? Number(e.promiseRes.value.maxAmount)
                    : undefined,
                };
                allLimits.push(e.promiseRes.value as SwapLimits);
                break;
            }
          }
        });

        if (allLimits.length > 0) {
          // If at least one enabled exchange does not have limits, then I set the limits to undefined,
          // this way the user can put any value in Amount modal
          const minMinAmount = allLimits.find(
            limit => limit.minAmount === undefined,
          )
            ? undefined
            : _.minBy(allLimits, 'minAmount')?.minAmount;
          const maxMaxAmount = allLimits.find(
            limit => limit.maxAmount === undefined,
          )
            ? undefined
            : _.maxBy(allLimits, 'maxAmount')?.maxAmount;

          setSwapLimits({
            minAmount: minMinAmount,
            maxAmount: maxMaxAmount,
          });
        }
      }
      setLoadingEnterAmountBtn(false);
    } catch (err) {
      logger.error('Swap crypto getLimits Error: ' + JSON.stringify(err));
      setLoadingEnterAmountBtn(false);
      const msg = t(
        'Swap Crypto feature is not available at this moment. Please try again later.',
      );
      dispatch(dismissOnGoingProcessModal());
      await sleep(200);
      showError(msg);
    }
  };

  const changellyGetLimits = async (
    fromWallet: Wallet,
    toWallet: Wallet,
  ): Promise<SwapLimits | undefined> => {
    const data = {
      coinFrom: getChangellyFixedCurrencyAbbreviation(
        fromWallet.currencyAbbreviation.toLowerCase(),
        fromWallet.chain,
      ),
      coinTo: getChangellyFixedCurrencyAbbreviation(
        toWallet.currencyAbbreviation.toLowerCase(),
        toWallet.chain,
      ),
    };
    try {
      const pairParamsData = await changellyGetPairsParams(fromWallet, data);
      if (pairParamsData.error) {
        logger.debug(
          'Changelly getPairsParams Error: ' +
            JSON.stringify(pairParamsData.error),
        );
        return;
      }

      if (
        pairParamsData.result &&
        (pairParamsData.result.length === 0 ||
          (pairParamsData.result[0] &&
            (!pairParamsData.result[0].maxAmountFixed ||
              Number(pairParamsData.result[0].maxAmountFixed) <= 0)))
      ) {
        // TODO: handle this error
        showChangellyPairDisabledError(fromWallet, toWallet);
        // setLoadingEnterAmountBtn(false);
        return;
      }

      const changellySwapLimits: SwapLimits = {
        minAmount: Number(pairParamsData.result[0].minAmountFixed),
        maxAmount: Number(pairParamsData.result[0].maxAmountFixed),
      };

      logger.debug(
        `[Changelly] Min amount: ${changellySwapLimits.minAmount} - Max amount: ${changellySwapLimits.maxAmount}`,
      );
      return changellySwapLimits;

      // TODO: review this errors, handle this in offers view?
      // setLoadingEnterAmountBtn(false);

      // if (amountFrom) {
      //   if (amountFrom > maxAmount) {
      //     const msg =
      //       t('The amount entered is greater than the maximum allowed: ') +
      //       maxAmount +
      //       ' ' +
      //       fromWallet.currencyAbbreviation.toUpperCase();
      //     const actions = [
      //       {
      //         text: t('OK'),
      //         action: () => {},
      //         primary: true,
      //       },
      //       {
      //         text: t('Use Max Amount'),
      //         action: async () => {
      //           setAmountFrom(maxAmount);
      //           await sleep(400);
      //           // updateReceivingAmount();
      //         },
      //         primary: true,
      //       },
      //     ];

      //     showError(msg, undefined, actions);
      //     return;
      //   }
      //   if (amountFrom < minAmount) {
      //     if (useSendMax && sendMaxInfo) {
      //       let msg = '';
      //       if (sendMaxInfo) {
      //         const warningMsg = dispatch(
      //           GetExcludedUtxosMessage(
      //             fromWallet.currencyAbbreviation,
      //             fromWallet.chain,
      //             fromWallet.tokenAddress,
      //             sendMaxInfo,
      //           ),
      //         );
      //         msg = warningMsg;
      //       }

      //       const estimatedFee = dispatch(
      //         SatToUnit(
      //           sendMaxInfo.fee,
      //           fromWallet.currencyAbbreviation,
      //           fromWallet.chain,
      //           fromWallet.tokenAddress,
      //         ),
      //       );
      //       const coin =
      //         fromWallet.currencyAbbreviation.toUpperCase();

      //       const ErrMsg =
      //         `As the estimated miner fee to complete the transaction is ${estimatedFee} ${coin}, the maximum spendable amount of your wallet is ${amountFrom} ${coin} which is lower than the minimum allowed by the exchange: ${minAmount} ${coin}.` +
      //         `\n${msg}`;
      //       showError(ErrMsg);
      //       return;
      //     } else {
      //       const msg =
      //         t('The amount entered is lower than the minimum allowed: ') +
      //         minAmount +
      //         ' ' +
      //         fromWallet.currencyAbbreviation.toUpperCase();
      //       const actions = [
      //         {
      //           text: t('OK'),
      //           action: () => {},
      //           primary: true,
      //         },
      //         {
      //           text: t('Use Min Amount'),
      //           action: async () => {
      //             setAmountFrom(minAmount);
      //             await sleep(400);
      //           },
      //           primary: true,
      //         },
      //       ];

      //       showError(msg, undefined, actions);
      //       return;
      //     }
      //   }
      // }
      // updateReceivingAmount();
    } catch (err) {
      logger.error('Changelly getPairsParams Error: ' + JSON.stringify(err));
      const msg = t(
        'Changelly is not available at this moment. Please try again later.',
      );
      setLoadingEnterAmountBtn(false);
      showError(msg);
    }
  };

  const thorswapGetLimits = (): Promise<SwapLimits | undefined> => {
    // By supporting multiple providers with different dust theresholds and limits considerations, Thorswap no longer maintains an endpoint to obtain the limits for a swap.
    // It was replaced by messages inside the getQuote function
    const thorswapSwapLimits: SwapLimits = {
      minAmount: undefined,
      maxAmount: undefined,
    };

    logger.debug('[Thorswap] Min amount: No limit - Max amount: No limit');
    return Promise.resolve(thorswapSwapLimits);
  };

  const showChangellyPairDisabledError = (
    fromWallet: Wallet,
    toWallet: Wallet,
  ) => {
    const title = t('Changelly Error');
    const actions = [
      {
        text: t('OK'),
        action: () => {},
        primary: true,
      },
      {
        text: t('Submit a ticket'),
        action: async () => {
          await sleep(1000);
          dispatch(
            openUrlWithInAppBrowser(
              'https://support.changelly.com/en/support/tickets/new',
            ),
          );
        },
        primary: true,
      },
    ];
    const msg = t(
      'Changelly has temporarily disabled - pair. If you have further questions please reach out to them.',
      {
        fromWalletSelected: `${fromWallet.currencyAbbreviation.toUpperCase()}(${fromWallet.chain.toUpperCase()})`,
        toWalletSelected: `${toWallet.currencyAbbreviation.toUpperCase()}(${toWallet.chain.toUpperCase()})`,
      },
    );
    showError(msg, title, actions);
  };

  const getSendMaxData = (): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      if (!fromWalletSelected) {
        return resolve(undefined);
      }
      try {
        const feeLevel = ['btc', 'eth', 'matic'].includes(
          fromWalletSelected.chain,
        )
          ? 'priority'
          : 'normal';

        const feeRate = await getFeeRatePerKb({
          wallet: fromWalletSelected,
          feeLevel,
        });

        const res = await getSendMaxInfo({
          wallet: fromWalletSelected,
          opts: {
            feePerKb: feeRate,
            excludeUnconfirmedUtxos: true, // Do not use unconfirmed UTXOs
            returnInputs: true,
          },
        });
        return resolve(res);
      } catch (err) {
        return reject(err);
      }
    });
  };

  const showError = async (
    msg?: string,
    title?: string,
    actions?: any,
    goBack?: boolean,
  ) => {
    dispatch(dismissOnGoingProcessModal());
    await sleep(400);
    setLoading(false);
    setLoadingEnterAmountBtn(false);
    await sleep(600);
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: title ? title : t('Error'),
        message: msg ? msg : t('Unknown Error'),
        enableBackdropDismiss: goBack ? false : true,
        actions: actions
          ? actions
          : [
              {
                text: t('OK'),
                action: () => {
                  if (goBack) {
                    navigation.goBack();
                  }
                },
                primary: true,
              },
            ],
      }),
    );
  };

  const getLinkedWallet = () => {
    if (!toWalletSelected) {
      return;
    }

    const linkedWallet = keys[toWalletSelected.keyId].wallets.find(({tokens}) =>
      tokens?.includes(toWalletSelected.id),
    );

    return linkedWallet;
  };

  const showTokensInfoSheet = () => {
    const linkedWallet = getLinkedWallet();
    if (!linkedWallet) {
      return;
    }

    const linkedWalletName =
      linkedWallet?.walletName || linkedWallet?.credentials.walletName;

    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'info',
        title: t('Reminder'),
        message: t('linkedWalletWarnMsg', {
          chain: BitpaySupportedCoins[linkedWallet.chain.toLowerCase()].name,
          chainCoin: linkedWallet.currencyAbbreviation.toUpperCase(),
          selectedWallet: toWalletSelected?.currencyAbbreviation.toUpperCase(),
          linkedWalletName: linkedWalletName
            ? '(' + linkedWalletName + ')'
            : ' ',
        }),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: async () => {
              await sleep(400);
              continueToCheckout();
            },
            primary: true,
          },
        ],
      }),
    );
  };

  const checkAmount = () => {
    if (!fromWalletSelected || !amountFrom) {
      setLoading(false);
      return;
    }

    if (fromWalletSelected?.balance?.satSpendable) {
      const spendableAmount = dispatch(
        SatToUnit(
          fromWalletSelected.balance.satSpendable,
          fromWalletSelected.currencyAbbreviation,
          fromWalletSelected.chain,
          fromWalletSelected.tokenAddress,
        ),
      );

      if (!!spendableAmount && spendableAmount < amountFrom) {
        const msg = t(
          'You are trying to send more funds than you have available. Make sure you do not have funds locked by pending transaction proposals or enter a valid amount.',
        );
        showError(msg);
        setLoading(false);
        setAmountFrom(0);
        setUseSendMax(false);
        setSendMaxInfo(undefined);
        setRateData(undefined);
        return;
      }
    }
  };

  const checkIfErc20Token = () => {
    const tokensWarn = async () => {
      await sleep(300);
      showTokensInfoSheet();
    };
    if (
      !!toWalletSelected &&
      IsERCToken(toWalletSelected.currencyAbbreviation, toWalletSelected.chain)
    ) {
      tokensWarn();
    } else {
      continueToCheckout();
    }
  };

  const continueToCheckout = () => {
    // TODO: review swap analytics
    dispatch(
      Analytics.track('Requested Swap Crypto', {
        fromCoin: fromWalletSelected!.currencyAbbreviation,
        fromChain: fromWalletSelected!.chain,
        toCoin: toWalletSelected!.currencyAbbreviation,
        toChain: toWalletSelected!.chain,
        amountFrom: amountFrom,
        // exchange: 'changelly',
      }),
    );

    navigation.navigate(SwapCryptoScreens.SWAP_CRYPTO_OFFERS, {
      selectedWalletFrom: fromWalletSelected!,
      coinFrom: fromWalletSelected!.currencyAbbreviation,
      chainFrom: fromWalletSelected!.chain,
      amountFrom: amountFrom,
      selectedWalletTo: toWalletSelected!,
      coinTo: toWalletSelected!.currencyAbbreviation,
      chainTo: toWalletSelected!.chain,
      country: locationData?.countryShortCode,
      swapCryptoConfig: swapCryptoConfig,
      preSetPartner: preSetPartner,
      preLoadPartnersData: swapCryptoExchangesDefault,
      useSendMax: IsERCToken(
        fromWalletSelected!.currencyAbbreviation,
        fromWalletSelected!.chain,
      )
        ? false
        : useSendMax,
      sendMaxInfo: sendMaxInfo,
    });
  };

  const filterChangellyCurrenciesConditions = (
    currency: ChangellyCurrency,
  ): boolean => {
    // TODO: accept all Changelly supported tokens => If no wallets: create a custom token wallet

    const changellySupportedChains = getChangellySupportedChains() ?? [];
    const changellySupportedEvmChains =
      getChangellySupportedChains('evm') ?? [];
    const currencyBlockchain = currency.blockchain
      ? cloneDeep(currency.blockchain).toLowerCase()
      : undefined;

    return (
      currency.enabled &&
      currency.fixRateEnabled &&
      !!currencyBlockchain &&
      changellySupportedChains.includes(currencyBlockchain) &&
      // If currency is not EVM => return true
      // If currency is EVM => check tokens
      (!changellySupportedEvmChains.includes(currencyBlockchain) ||
        currency.name === 'eth' ||
        allSupportedTokens.includes(
          getCurrencyAbbreviation(
            currency.name,
            getChainFromChangellyBlockchain(currency.name, currency.blockchain),
          ),
        ))
    );
  };

  const getLogoUri = (_currencyAbbreviation: string, _chain: string) => {
    const foundToken = Object.values(tokenDataByAddress).find(
      token => token.coin === _currencyAbbreviation && token.chain === _chain,
    );
    if (
      SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === _currencyAbbreviation &&
          (!chain || chain === _chain),
      )
    ) {
      return SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === _currencyAbbreviation &&
          (!chain || chain === _chain),
      )!.img;
    } else if (foundToken?.logoURI) {
      return foundToken?.logoURI;
    } else {
      return undefined;
    }
  };

  const getChangellyCurrencies = async () => {
    const changellyCurrenciesData = await changellyGetCurrencies(true);

    if (changellyCurrenciesData?.result?.length) {
      const changellyCurrenciesDataFixedNames: ChangellyCurrency[] =
        getChangellyCurrenciesFixedProps(
          changellyCurrenciesData.result as ChangellyCurrency[],
        );

      const supportedCoinsWithFixRateEnabled: SwapCryptoCoin[] =
        changellyCurrenciesDataFixedNames
          .filter((changellyCurrency: ChangellyCurrency) =>
            filterChangellyCurrenciesConditions(changellyCurrency),
          )
          .map(
            ({
              name,
              fullName,
              protocol,
              blockchain,
              contractAddress,
            }: {
              name: string;
              fullName: string;
              protocol?: string;
              blockchain?: ChangellyCurrencyBlockchain;
              contractAddress?: string;
            }) => {
              const chain = getChainFromChangellyBlockchain(name, blockchain);
              return {
                currencyAbbreviation: name.toLowerCase(),
                symbol: getCurrencyAbbreviation(name, chain),
                name: fullName,
                chain,
                protocol,
                blockchain: blockchain?.toLowerCase(),
                logoUri: getLogoUri(name.toLowerCase(), chain),
                badgeUri: getBadgeImg(name.toLowerCase(), chain),
                tokenAddress: contractAddress,
                supportedBy: {changelly: true},
              };
            },
          );

      // TODO: add support to float-rate coins supported by Changelly

      // Sort the array with our supported coins first and then the unsupported ones sorted alphabetically
      const orderedArray = SupportedCurrencyOptions.map(currency =>
        currency.chain
          ? getCurrencyAbbreviation(
              currency.currencyAbbreviation,
              currency.chain,
            )
          : currency.currencyAbbreviation,
      );
      let supportedCoins = orderBy(
        supportedCoinsWithFixRateEnabled,
        [
          coin => {
            return orderedArray.includes(coin.symbol)
              ? orderedArray.indexOf(coin.symbol)
              : orderedArray.length;
          },
          'name',
        ],
        ['asc', 'asc'],
      );

      // TODO: review these errors and handle if necessary
      if (supportedCoins.length === 0) {
        const msg = t(
          'Our partner Changelly is not currently available. Please try again later.',
        );
        showError(msg, undefined, undefined, true);
      }

      if (selectedWallet?.chain && selectedWallet?.currencyAbbreviation) {
        const selectedWalletSymbol = getCurrencyAbbreviation(
          selectedWallet!.currencyAbbreviation,
          selectedWallet!.chain,
        );
        const isSelectedWalletSymbolEnabled = supportedCoins.find(
          supportedCoin => supportedCoin.symbol === selectedWalletSymbol,
        );
        if (!isSelectedWalletSymbolEnabled) {
          logger.error(
            `Changelly has temporarily disabled fixed-rates swaps for ${selectedWalletSymbol}`,
          );
          const actions = [
            {
              text: t('OK'),
              action: () => {
                navigation.goBack();
              },
              primary: true,
            },
            {
              text: t('Submit a ticket'),
              action: async () => {
                await sleep(1000);
                dispatch(
                  openUrlWithInAppBrowser(
                    'https://support.changelly.com/en/support/tickets/new',
                  ),
                );
                navigation.goBack();
              },
              primary: true,
            },
          ];
          const selectedCoin = cloneDeep(
            selectedWallet.currencyAbbreviation,
          ).toUpperCase();
          const selectedChain = cloneDeep(selectedWallet.chain).toUpperCase();
          const title = t('Changelly Error');
          const msg = t(
            'Changelly has temporarily disabled fixed-rate swaps for the selected wallet (selectedCoin-selectedChain). If you have further questions please reach out to them.',
            {
              selectedCoin,
              selectedChain,
            },
          );
          selectedWallet = undefined;
          showError(msg, title, actions, true);
          return;
        }
      }

      const coinsToRemove =
        !locationData || locationData.countryShortCode === 'US' ? ['xrp'] : [];
      coinsToRemove.push('busd');
      if (selectedWallet?.balance?.satSpendable === 0) {
        coinsToRemove.push(selectedWallet.currencyAbbreviation.toLowerCase());
      }
      if (coinsToRemove.length > 0) {
        logger.debug(
          `Removing ${JSON.stringify(
            coinsToRemove,
          )} from Changelly supported coins`,
        );
        supportedCoins = supportedCoins.filter(
          supportedCoin =>
            !coinsToRemove.includes(supportedCoin.currencyAbbreviation),
        );
      }

      return supportedCoins;
    }
  };

  const filterThorswapCurrenciesConditions = (
    currency: ThorswapCurrency,
  ): boolean => {
    // TODO: accept all Thorswap supported tokens => If no wallets: create a custom token wallet

    return (
      currency.enabled &&
      !!currency.protocol &&
      !!currency.ticker &&
      [...SupportedChains].includes(currency.protocol.toLowerCase()) &&
      (['eth', 'matic', 'polygon'].includes(currency.protocol.toLowerCase())
        ? allSupportedTokens.includes(
            getCurrencyAbbreviation(
              currency.ticker.toLowerCase(),
              currency.protocol.toLowerCase(),
            ),
          )
        : true)
    );
  };

  const getThorswapCurrencies = async () => {
    const reqData: ThorswapGetCurrenciesRequestData = {
      env: thorswapEnv,
      categories: 'all',
      includeDetails: true,
    };
    const thorswapCurrenciesData: ThorswapCurrency[] =
      await thorswapGetCurrencies(reqData);

    if (thorswapCurrenciesData?.length) {
      const thorswapCurrenciesDataFixedNames: ThorswapCurrency[] =
        getThorswapCurrenciesFixedProps(
          thorswapCurrenciesData as ThorswapCurrency[],
        );

      let supportedCoinsWithFixRateEnabled: SwapCryptoCoin[] =
        thorswapCurrenciesDataFixedNames
          .filter((thorswapCurrency: ThorswapCurrency) =>
            filterThorswapCurrenciesConditions(thorswapCurrency),
          )
          .map(
            ({
              name,
              fullName,
              ticker,
              protocol,
              address,
            }: {
              name: string;
              fullName: string;
              ticker: string;
              protocol: string;
              address?: string;
            }) => {
              const getFullName = (
                ticker: string,
                protocol: string,
                address: string | undefined,
              ): string | undefined => {
                let fullName: string | undefined;
                if (address && address !== '') {
                  const tokenAddressSuffix = addTokenChainSuffix(
                    address.toLowerCase(),
                    protocol.toLowerCase(),
                  );
                  fullName = BitpaySupportedTokens[tokenAddressSuffix]
                    ? BitpaySupportedTokens[tokenAddressSuffix].name
                    : undefined;
                } else {
                  fullName = BitpaySupportedCoins[ticker.toLowerCase()]
                    ? BitpaySupportedCoins[ticker.toLowerCase()].name
                    : undefined;
                }

                return fullName;
              };
              return {
                currencyAbbreviation: ticker.toLowerCase(),
                symbol: getCurrencyAbbreviation(
                  ticker.toLowerCase(),
                  protocol.toLowerCase(),
                ),
                name:
                  getFullName(ticker, protocol, address) ?? fullName ?? name,
                chain: protocol.toLowerCase(),
                protocol,
                logoUri: getLogoUri(
                  ticker.toLowerCase(),
                  protocol.toLowerCase(),
                ),
                tokenAddress: address && address !== '' ? address : undefined,
                supportedBy: {thorswap: true},
              };
            },
          );

      supportedCoinsWithFixRateEnabled = _.uniqBy(
        supportedCoinsWithFixRateEnabled,
        'symbol',
      );

      // Sort the array with our supported coins first and then the unsupported ones sorted alphabetically
      const orderedArray = SupportedCurrencyOptions.map(currency =>
        currency.chain
          ? getCurrencyAbbreviation(
              currency.currencyAbbreviation,
              currency.chain,
            )
          : currency.currencyAbbreviation,
      );
      let supportedCoins = orderBy(
        supportedCoinsWithFixRateEnabled,
        [
          coin => {
            return orderedArray.includes(coin.symbol)
              ? orderedArray.indexOf(coin.symbol)
              : orderedArray.length;
          },
          'name',
        ],
        ['asc', 'asc'],
      );

      return supportedCoins;

      // TODO: review these errors and handle if necessary
      //   if (supportedCoins.length === 0) {
      //     const msg = t(
      //       'Our partner Thorswap is not currently available. Please try again later.',
      //     );
      //     showError(msg, undefined, undefined, true);
      //   }

      //   if (selectedWallet?.chain && selectedWallet?.currencyAbbreviation) {
      //     const selectedWalletSymbol = getCurrencyAbbreviation(
      //       selectedWallet!.currencyAbbreviation,
      //       selectedWallet!.chain,
      //     );
      //     const isSelectedWalletSymbolEnabled = supportedCoins.find(
      //       supportedCoin => supportedCoin.symbol === selectedWalletSymbol,
      //     );
      //     if (!isSelectedWalletSymbolEnabled) {
      //       logger.error(
      //         `Thorswap has temporarily disabled fixed-rates swaps for ${selectedWalletSymbol}`,
      //       );
      //       const actions = [
      //         {
      //           text: t('OK'),
      //           action: () => {
      //             navigation.goBack();
      //           },
      //           primary: true,
      //         },
      //         {
      //           text: t('Submit a ticket'),
      //           action: async () => {
      //             await sleep(1000);
      //             dispatch(
      //               openUrlWithInAppBrowser(
      //                 'https://support.thorswap.com/en/support/tickets/new',
      //               ),
      //             );
      //             navigation.goBack();
      //           },
      //           primary: true,
      //         },
      //       ];
      //       const selectedCoin = cloneDeep(
      //         selectedWallet.currencyAbbreviation,
      //       ).toUpperCase();
      //       const selectedChain = cloneDeep(selectedWallet.chain).toUpperCase();
      //       const title = t('Thorswap Error');
      //       const msg = t(
      //         'Thorswap has temporarily disabled fixed-rate swaps for the selected wallet (selectedCoin-selectedChain). If you have further questions please reach out to them.',
      //         {
      //           selectedCoin,
      //           selectedChain,
      //         },
      //       );
      //       selectedWallet = undefined;
      //       showError(msg, title, actions, true);
      //       return;
      //     }
      //   }

      //   const coinsToRemove =
      //     !locationData || locationData.countryShortCode === 'US' ? ['xrp'] : [];
      //   coinsToRemove.push('busd');
      //   if (selectedWallet?.balance?.satSpendable === 0) {
      //     coinsToRemove.push(selectedWallet.currencyAbbreviation.toLowerCase());
      //   }
      //   if (coinsToRemove.length > 0) {
      //     logger.debug(
      //       `Removing ${JSON.stringify(
      //         coinsToRemove,
      //       )} from Thorswap supported coins`,
      //     );
      //     supportedCoins = supportedCoins.filter(
      //       supportedCoin =>
      //         !coinsToRemove.includes(supportedCoin.currencyAbbreviation),
      //     );
      //   }

      //   setSwapCryptoSupportedCoinsFrom(supportedCoins);
    }
  };

  const openWalletBalanceModal = () => {
    if (!fromWalletSelected) {
      return;
    }
    const uiFormattedWallet = buildUIFormattedWallet(
      fromWalletSelected,
      defaultAltCurrency.isoCode,
      rates,
      dispatch,
      'symbol',
    );

    setUiFormattedWallet(uiFormattedWallet);
    setBalanceDetailsModalVisible(true);
  };

  const init = async () => {
    dispatch(startOnGoingProcessModal('GENERAL_AWAITING'));

    try {
      const requestData: ExternalServicesConfigRequestParams = {
        currentLocationCountry: locationData?.countryShortCode,
        currentLocationState: locationData?.stateShortCode,
        bitpayIdLocationCountry: user?.country,
        bitpayIdLocationState: user?.state,
      };
      const config: ExternalServicesConfig = await dispatch(
        getExternalServicesConfig(requestData),
      );
      swapCryptoConfig = config?.swapCrypto;
      logger.debug('swapCryptoConfig: ' + JSON.stringify(swapCryptoConfig));
    } catch (err) {
      logger.error('getSwapCryptoConfig Error: ' + JSON.stringify(err));
    }

    if (swapCryptoConfig?.disabled) {
      dispatch(dismissOnGoingProcessModal());
      await sleep(600);
      dispatch(
        AppActions.showBottomNotificationModal({
          title: swapCryptoConfig?.disabledTitle
            ? swapCryptoConfig.disabledTitle
            : t('Out of service'),
          message: swapCryptoConfig?.disabledMessage
            ? swapCryptoConfig.disabledMessage
            : t(
                'This feature is temporarily out of service. Please try again later.',
              ),
          type: 'warning',
          actions: [
            {
              text: t('OK'),
              action: () => {
                navigation.dispatch(StackActions.popToTop());
              },
            },
          ],
          enableBackdropDismiss: true,
          onBackdropDismiss: () => {
            navigation.dispatch(StackActions.popToTop());
          },
        }),
      );
      return;
    }

    const supportedExchanges: SwapCryptoExchangeKey[] = Object.keys(
      swapCryptoExchangesDefault,
    ) as SwapCryptoExchangeKey[];

    // prevent "getCurrencies" from deleted or disabled exchanges
    supportedExchanges.forEach(exchange => {
      if (swapCryptoConfig && swapCryptoConfig[exchange]) {
        swapCryptoExchangesDefault[exchange].showOffer =
          !swapCryptoConfig[exchange]?.removed;
        swapCryptoExchangesDefault[exchange].disabled =
          !!swapCryptoConfig[exchange]?.disabled;
      }
    });

    const enabledExchanges = Object.values(swapCryptoExchangesDefault)
      .filter(exchange => exchange.showOffer && !exchange.disabled)
      .map(exchange => exchange.key);

    const getCurrenciesPromiseByExchange = (
      exchange: SwapCryptoExchangeKey,
    ) => {
      switch (exchange) {
        case 'changelly':
          return getChangellyCurrencies();
        case 'thorswap':
          return getThorswapCurrencies();
        default:
          return Promise.resolve([]);
      }
    };

    const getCurrenciesPromises = enabledExchanges.map(exchange =>
      getCurrenciesPromiseByExchange(exchange),
    );

    try {
      const responseByExchange = await Promise.allSettled([
        ...getCurrenciesPromises,
        sleep(400),
      ]);
      const responseByExchangeKey = responseByExchange.map((res, index) => {
        const exchangeKey: SwapCryptoExchangeKey | undefined =
          enabledExchanges[index] ?? undefined;
        return {exchangeKey, promiseRes: res};
      });

      let allSupportedCoins: SwapCryptoCoin[] = [];

      if (responseByExchangeKey instanceof Array) {
        responseByExchangeKey.forEach((e, index) => {
          if (e.promiseRes.status === 'rejected') {
            logger.error(
              `Swap crypto getCurrencies[${index}] Rejected: + ${JSON.stringify(
                e.promiseRes.reason,
              )}`,
            );
            if (e.promiseRes.reason instanceof Error) {
              switch (e.exchangeKey) {
                case 'changelly':
                  logger.debug(
                    'getChangellyCurrencies Error: ' +
                      e.promiseRes.reason.message,
                  );
                  swapCryptoExchangesDefault.changelly.showOffer = false;
                  break;
                case 'thorswap':
                  logger.debug(
                    'getThorswapCurrencies Error: ' +
                      e.promiseRes.reason.message,
                  );
                  swapCryptoExchangesDefault.thorswap.showOffer = false;
                  break;
                default:
                  logger.debug('Error: ' + e.promiseRes.reason.message);
                  break;
              }
            }
          } else if (e.promiseRes.status === 'fulfilled') {
            switch (e.exchangeKey) {
              case 'changelly':
                swapCryptoExchangesDefault.changelly.supportedCoins = e
                  .promiseRes.value as SwapCryptoCoin[];
                break;
              case 'thorswap':
                swapCryptoExchangesDefault.thorswap.supportedCoins = e
                  .promiseRes.value as SwapCryptoCoin[];
                break;
              default:
                break;
            }

            allSupportedCoins = [
              ...allSupportedCoins,
              ...((e.promiseRes.value as SwapCryptoCoin[]) || []),
            ];
          }
        });
        if (allSupportedCoins.length > 0) {
          allSupportedCoins = _.uniqBy(allSupportedCoins, 'symbol');
        }
        setSwapCryptoSupportedCoinsFrom(allSupportedCoins);
      }
    } catch (err) {
      logger.error('Swap crypto getCurrencies Error: ' + JSON.stringify(err));
      const msg = t(
        'Swap Crypto feature is not available at this moment. Please try again later.',
      );
      dispatch(dismissOnGoingProcessModal());
      await sleep(200);
      showError(msg);
    }
  };

  const onDismiss = async (
    toWallet?: Wallet,
    createToWalletData?: AddWalletData,
  ) => {
    hideModal('toWalletSelector');
    if (toWallet?.currencyAbbreviation) {
      setToWallet(toWallet);
    } else if (createToWalletData) {
      try {
        if (createToWalletData.key.isPrivKeyEncrypted) {
          logger.debug('Key is Encrypted. Trying to decrypt...');
          await sleep(500);
          const password = await dispatch(
            getDecryptPassword(createToWalletData.key),
          );
          createToWalletData.options.password = password;
        }

        await sleep(500);
        await dispatch(startOnGoingProcessModal('ADDING_WALLET'));

        const createdToWallet = await dispatch(addWallet(createToWalletData));
        logger.debug(
          `Added ${createdToWallet?.currencyAbbreviation} wallet from Swap Crypto`,
        );
        dispatch(
          Analytics.track('Created Basic Wallet', {
            coin: createToWalletData.currency.currencyAbbreviation,
            chain: createToWalletData.currency.chain,
            isErc20Token: createToWalletData.currency.isToken,
            context: 'swapCrypto',
          }),
        );
        setToWallet(createdToWallet);
        await sleep(300);
        dispatch(dismissOnGoingProcessModal());
      } catch (err: any) {
        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
        if (err.message === 'invalid password') {
          dispatch(showBottomNotificationModal(WrongPasswordError()));
        } else {
          showError(err.message);
        }
      }
    }
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (swapCryptoSupportedCoinsFrom) {
      setSelectedWallet();
    }
  }, [swapCryptoSupportedCoinsFrom]);

  useEffect(() => {
    swapGetLimits();
  }, [fromWalletSelected, toWalletSelected]);

  useEffect(() => {
    checkAmount();
  }, [amountFrom]);

  return (
    <>
      <SwapCryptoContainer>
        <ScrollView>
          <SwapCryptoCard>
            <SummaryTitle>{t('From')}</SummaryTitle>
            {!fromWalletSelected && !loadingWalletFromStatus && (
              <ActionsContainer>
                <SelectedOptionContainer
                  style={{backgroundColor: Action}}
                  disabled={swapCryptoSupportedCoinsFrom?.length === 0}
                  onPress={() => {
                    showModal('fromWalletSelector');
                  }}>
                  <SelectedOptionText
                    style={{color: White}}
                    numberOfLines={1}
                    ellipsizeMode={'tail'}>
                    {t('Select Wallet')}
                  </SelectedOptionText>
                  <SelectorArrowContainer>
                    <SelectorArrowDown
                      {...{width: 13, height: 13, color: White}}
                    />
                  </SelectorArrowContainer>
                </SelectedOptionContainer>
              </ActionsContainer>
            )}
            {(fromWalletSelected || loadingWalletFromStatus) && (
              <>
                <ActionsContainer>
                  <SelectedOptionContainer
                    style={{minWidth: 120}}
                    onPress={() => {
                      showModal('fromWalletSelector');
                    }}>
                    {fromWalletSelected && !loadingWalletFromStatus ? (
                      <SelectedOptionCol>
                        <CoinIconContainer>
                          <CurrencyImage
                            img={fromWalletSelected.img}
                            badgeUri={getBadgeImg(
                              getCurrencyAbbreviation(
                                fromWalletSelected.currencyAbbreviation,
                                fromWalletSelected.chain,
                              ),
                              fromWalletSelected.chain,
                            )}
                            size={20}
                          />
                        </CoinIconContainer>
                        <SelectedOptionText
                          numberOfLines={1}
                          ellipsizeMode={'tail'}>
                          {fromWalletSelected.walletName
                            ? fromWalletSelected.walletName
                            : fromWalletSelected.currencyName}
                        </SelectedOptionText>
                      </SelectedOptionCol>
                    ) : (
                      <SelectedOptionCol>
                        <SwapCryptoLoadingWalletSkeleton />
                      </SelectedOptionCol>
                    )}
                    <ArrowContainer>
                      <SelectorArrowDown
                        {...{
                          width: 13,
                          height: 13,
                          color: theme.dark ? White : SlateDark,
                        }}
                      />
                    </ArrowContainer>
                  </SelectedOptionContainer>

                  {toWalletSelected ? (
                    <>
                      {loadingEnterAmountBtn ? (
                        <SpinnerContainer>
                          <ActivityIndicator color={ProgressBlue} />
                        </SpinnerContainer>
                      ) : (
                        <>
                          {!(amountFrom && amountFrom > 0) && !useSendMax ? (
                            <SelectedOptionContainer
                              style={{backgroundColor: Action}}
                              disabled={false}
                              onPress={() => {
                                showModal('amount');
                              }}>
                              <SelectedOptionCol>
                                <SelectedOptionText
                                  style={{color: White}}
                                  numberOfLines={1}
                                  ellipsizeMode={'tail'}>
                                  {t('Enter Amount')}
                                </SelectedOptionText>
                              </SelectedOptionCol>
                            </SelectedOptionContainer>
                          ) : (
                            <SelectedOptionCol>
                              <TouchableOpacity
                                onPress={() => {
                                  showModal('amount');
                                }}>
                                {useSendMax ? (
                                  <DataText style={{fontSize: 14}}>
                                    {t('Maximum Amount')}
                                  </DataText>
                                ) : (
                                  <DataText>
                                    {amountFrom && amountFrom > 0
                                      ? amountFrom
                                      : '0.00'}
                                  </DataText>
                                )}
                              </TouchableOpacity>
                            </SelectedOptionCol>
                          )}
                        </>
                      )}
                    </>
                  ) : null}
                </ActionsContainer>
                {fromWalletSelected?.balance?.cryptoSpendable &&
                !loadingWalletFromStatus ? (
                  <BalanceContainer style={{marginTop: 14}}>
                    <BottomDataText>
                      {fromWalletSelected.balance.cryptoSpendable}{' '}
                      {fromWalletSelected.currencyAbbreviation.toUpperCase()}{' '}
                      {t('available to swap')}
                    </BottomDataText>
                    {fromWalletSelected.balance.cryptoSpendable !==
                    fromWalletSelected.balance.crypto ? (
                      <TouchableOpacity
                        onPress={() => {
                          logger.debug('Balance info clicked');
                          openWalletBalanceModal();
                        }}
                        style={{marginLeft: 8}}>
                        <InfoSvg width={20} height={20} />
                      </TouchableOpacity>
                    ) : null}
                  </BalanceContainer>
                ) : null}

                {loadingWalletFromStatus && <SwapCryptoBalanceSkeleton />}
              </>
            )}
          </SwapCryptoCard>

          <ArrowContainer>
            <ArrowDown />
          </ArrowContainer>

          <SwapCryptoCard>
            <SummaryTitle>{t('To')}</SummaryTitle>
            {!toWalletSelected && (
              <ActionsContainer>
                <SelectedOptionContainer
                  style={{backgroundColor: Action}}
                  disabled={!isToWalletEnabled()}
                  onPress={() => {
                    if (!isToWalletEnabled()) {
                      return;
                    }
                    showModal('toWalletSelector');
                  }}>
                  <SelectedOptionText
                    style={{color: White}}
                    numberOfLines={1}
                    ellipsizeMode={'tail'}>
                    {t('Select Crypto')}
                  </SelectedOptionText>
                  <SelectorArrowContainer>
                    <SelectorArrowDown
                      {...{width: 13, height: 13, color: White}}
                    />
                  </SelectorArrowContainer>
                </SelectedOptionContainer>
              </ActionsContainer>
            )}
            {toWalletSelected && (
              <>
                <ActionsContainer>
                  <SelectedOptionContainer
                    style={{minWidth: 120}}
                    onPress={() => {
                      if (useDefaultToWallet || !isToWalletEnabled()) {
                        return;
                      }
                      showModal('toWalletSelector');
                    }}>
                    <SelectedOptionCol>
                      <CoinIconContainer>
                        <CurrencyImage
                          img={toWalletSelected.img}
                          badgeUri={getBadgeImg(
                            getCurrencyAbbreviation(
                              toWalletSelected.currencyAbbreviation,
                              toWalletSelected.chain,
                            ),
                            toWalletSelected.chain,
                          )}
                          size={20}
                        />
                      </CoinIconContainer>
                      <SelectedOptionText
                        numberOfLines={1}
                        ellipsizeMode={'tail'}>
                        {toWalletSelected.walletName
                          ? toWalletSelected.walletName
                          : toWalletSelected.currencyName}
                      </SelectedOptionText>
                    </SelectedOptionCol>
                    {!useDefaultToWallet && (
                      <ArrowContainer>
                        <SelectorArrowDown
                          {...{
                            width: 13,
                            height: 13,
                            color: theme.dark ? White : SlateDark,
                          }}
                        />
                      </ArrowContainer>
                    )}
                  </SelectedOptionContainer>
                  {!rateData?.amountTo && loading && (
                    <SpinnerContainer>
                      <ActivityIndicator color={ProgressBlue} />
                    </SpinnerContainer>
                  )}
                </ActionsContainer>
              </>
            )}
          </SwapCryptoCard>

          <CtaContainer>
            <Button
              buttonStyle={'primary'}
              disabled={!canContinue()}
              onPress={() => {
                checkIfErc20Token();
              }}>
              {t('View Offers')}
            </Button>
          </CtaContainer>
        </ScrollView>
      </SwapCryptoContainer>

      {uiFormattedWallet ? (
        <BalanceDetailsModal
          isVisible={balanceDetailsModalVisible}
          closeModal={() => setBalanceDetailsModalVisible(false)}
          wallet={uiFormattedWallet}
        />
      ) : null}

      <FromWalletSelectorModal
        isVisible={fromWalletSelectorModalVisible}
        customSupportedCurrencies={swapCryptoSupportedCoinsFrom}
        livenetOnly={true}
        modalContext={'swap'}
        modalTitle={t('Swap From')}
        onDismiss={(fromWallet: Wallet) => {
          hideModal('fromWalletSelector');
          if (fromWallet?.currencyAbbreviation) {
            setFromWallet(fromWallet);
          }
        }}
      />

      <SheetModal
        isVisible={toWalletSelectorModalVisible}
        onBackdropPress={() => onDismiss()}>
        <GlobalSelectContainer
          style={Platform.OS === 'ios' ? {paddingTop: insets.top} : {}}>
          <GlobalSelect
            modalContext={'swap'}
            livenetOnly={true}
            useAsModal={true}
            modalTitle={t('Swap To')}
            customToSelectCurrencies={swapCryptoSupportedCoinsTo}
            disabledChain={
              fromWalletSelected
                ? getCurrencyAbbreviation(
                    fromWalletSelected.currencyAbbreviation,
                    fromWalletSelected.chain,
                  )
                : undefined
            }
            globalSelectOnDismiss={onDismiss}
            selectingNetworkForDeposit={true}
          />
        </GlobalSelectContainer>
      </SheetModal>

      <AmountModal
        isVisible={amountModalVisible}
        modalTitle={t('Swap Amount')}
        context={'swapCrypto'}
        limitsOpts={{
          maxWalletAmount:
            // @ts-ignore
            fromWalletSelected?.balance?.cryptoSpendable?.replaceAll(',', ''),
          limits: swapLimits,
        }}
        cryptoCurrencyAbbreviation={fromWalletSelected?.currencyAbbreviation.toUpperCase()}
        tokenAddress={fromWalletSelected?.tokenAddress}
        chain={fromWalletSelected?.chain}
        onClose={() => hideModal('amount')}
        onSubmit={newAmount => {
          hideModal('amount');
          setUseSendMax(false);
          setSendMaxInfo(undefined);
          setAmountFrom(newAmount);
        }}
        onSendMaxPressed={async () => {
          hideModal('amount');

          if (!fromWalletSelected) {
            return;
          }

          let newAmount: number | undefined;

          if (
            IsERCToken(
              fromWalletSelected.currencyAbbreviation,
              fromWalletSelected.chain,
            )
          ) {
            setUseSendMax(true);
            setSendMaxInfo(undefined);
            newAmount = Number(
              // @ts-ignore
              fromWalletSelected.balance.cryptoSpendable.replaceAll(',', ''),
            );
          } else {
            setUseSendMax(true);
            const data = await getSendMaxData();
            setSendMaxInfo(data);
            if (data?.amount) {
              newAmount = dispatch(
                SatToUnit(
                  data.amount,
                  fromWalletSelected.currencyAbbreviation,
                  fromWalletSelected.chain,
                  fromWalletSelected.tokenAddress,
                ),
              );
            }
          }

          if (newAmount) {
            setAmountFrom(newAmount);
          }
        }}
      />
    </>
  );
};

export default SwapCryptoRoot;
