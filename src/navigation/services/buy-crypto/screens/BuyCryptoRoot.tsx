import React, {useEffect, useState} from 'react';
import {ScrollView} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RouteProp} from '@react-navigation/core';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import styled from 'styled-components/native';
import {BuyCryptoStackParamList} from '../BuyCryptoStack';
import {PaymentMethodsAvailable} from '../constants/BuyCryptoConstants';
import PaymentMethodsModal from '../components/PaymentMethodModal';
import WalletSelectorModal from '../components/WalletSelectorModal';
import AmountModal from '../components/AmountModal';
import {
  BuyCryptoItemCard,
  BuyCryptoItemTitle,
  ActionsContainer,
  SelectedOptionCol,
  SelectedOptionContainer,
  SelectedOptionText,
  DataText,
  CoinIconContainer,
} from '../styled/BuyCryptoCard';
import Button from '../../../../components/button/Button';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {ItemProps} from '../../../../components/list/CurrencySelectionRow';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {RootState} from '../../../../store';
import {AppActions} from '../../../../store/app';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {Action, White} from '../../../../styles/colors';
import SelectorArrowDown from '../../../../../assets/img/selector-arrow-down.svg';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {getCountry} from '../../../../lib/location/location';
import {simplexSupportedCoins} from '../utils/simplex-utils';
import {wyreSupportedCoins} from '../utils/wyre-utils';
import {sleep} from '../../../../utils/helper-methods';

const CtaContainer = styled.View`
  margin: 20px 15px;
`;

const ArrowContainer = styled.View`
  margin-left: 10px;
`;

const BuyCryptoRoot: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const route = useRoute<RouteProp<BuyCryptoStackParamList, 'Root'>>();
  const allKeys: any = useSelector(({WALLET}: RootState) => WALLET.keys);

  const fromWallet = route.params?.fromWallet;
  const fromAmount = route.params?.amount;

  const [amount, setAmount] = useState<number>(fromAmount ? fromAmount : 0);
  const [selectedWallet, setSelectedWallet] = useState<Wallet>();
  const [walletData, setWalletData] = useState<ItemProps>();
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] =
    useState(false);
  const [walletSelectorModalVisible, setWalletSelectorModalVisible] =
    useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    PaymentMethodsAvailable.debitCard,
  );
  const [country, setCountry] = useState('US');

  const supportedCoins = [
    ...new Set([...simplexSupportedCoins, ...wyreSupportedCoins]),
  ];

  const showModal = (id: string) => {
    switch (id) {
      case 'paymentMethod':
        setPaymentMethodModalVisible(true);
        break;
      case 'walletSelector':
        setWalletSelectorModalVisible(true);
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
      case 'paymentMethod':
        setPaymentMethodModalVisible(false);
        break;
      case 'walletSelector':
        setWalletSelectorModalVisible(false);
        break;
      case 'amount':
        setAmountModalVisible(false);
        break;
      default:
        break;
    }
  };

  const updateWalletData = () => {
    if (selectedWallet) {
      setWalletData(
        SupportedCurrencyOptions.find(
          currency =>
            selectedWallet && currency.id == selectedWallet.credentials.coin,
        ),
      );
    }
  };

  const selectFirstAvailableWallet = () => {
    const keysList = Object.values(allKeys).filter((key: any) => key.show);

    if (fromWallet && fromWallet.id) {
      let fromWalletData;
      let allWallets: any[] = [];

      keysList.forEach((key: any) => {
        allWallets = [...allWallets, ...key.wallets];
      });

      fromWalletData = allWallets.find(wallet => wallet.id == fromWallet.id);
      if (fromWalletData) {
        setWallet(fromWalletData);
      }
    } else {
      if (keysList[0]) {
        const firstKey: any = keysList[0];
        const firstKeyAllWallets: any[] = firstKey.wallets;
        const allowedWallets = firstKeyAllWallets.filter(
          wallet =>
            wallet.credentials &&
            wallet.credentials.network == 'livenet' &&
            supportedCoins.includes(wallet.credentials.coin.toLowerCase()),
        );
        allowedWallets[0]
          ? setSelectedWallet(allowedWallets[0])
          : showError('walletNotSupported');
      }
    }
  };

  const setWallet = (wallet: any) => {
    if (
      wallet.credentials &&
      wallet.credentials.network == 'livenet' &&
      supportedCoins.includes(wallet.credentials.coin.toLowerCase())
    ) {
      setSelectedWallet(wallet);
    } else {
      showError('walletNotSupported');
    }
  };

  const showError = async (type?: string) => {
    let title, message: string;
    switch (type) {
      case 'walletNotSupported':
        title = 'Wallet not supported';
        message =
          'The selected wallet is currently not supported for buying cryptocurrencies';
        break;

      default:
        title = 'Error';
        message = 'Unknown Error';
        break;
    }
    await sleep(500);
    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'error',
        title,
        message,
        enableBackdropDismiss: true,
        actions: [
          {
            text: 'OK',
            action: () => {
              dispatch(AppActions.dismissBottomNotificationModal());
            },
            primary: true,
          },
        ],
      }),
    );
  };

  useEffect(() => {
    const getCountryData = async () => {
      const countryData = await getCountry();
      setCountry(countryData);
    };

    getCountryData().catch(console.error);
    selectFirstAvailableWallet();
  }, []);

  useEffect(() => {
    updateWalletData();
  }, [selectedWallet]);

  return (
    <>
      <ScrollView>
        <BuyCryptoItemCard>
          <BuyCryptoItemTitle>Amount</BuyCryptoItemTitle>
          <ActionsContainer
            onPress={() => {
              // navigation.goBack();
              showModal('amount');
            }}>
            <SelectedOptionContainer>
              <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                USD
              </SelectedOptionText>
            </SelectedOptionContainer>
            <SelectedOptionCol>
              <DataText>{amount}</DataText>
              <ArrowContainer>
                <SelectorArrowRight
                  {...{
                    width: 13,
                    height: 13,
                    color: theme.dark ? 'white' : '#9ba3ae',
                  }}
                />
              </ArrowContainer>
            </SelectedOptionCol>
          </ActionsContainer>
        </BuyCryptoItemCard>

        <BuyCryptoItemCard>
          <BuyCryptoItemTitle>Deposit to</BuyCryptoItemTitle>
          {!selectedWallet && (
            <ActionsContainer
              onPress={() => {
                showModal('walletSelector');
              }}>
              <SelectedOptionContainer style={{backgroundColor: Action}}>
                <SelectedOptionText
                  style={{color: White}}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}>
                  Select Destination
                </SelectedOptionText>
                <ArrowContainer>
                  <SelectorArrowDown
                    {...{width: 13, height: 13, color: 'white'}}
                  />
                </ArrowContainer>
              </SelectedOptionContainer>
            </ActionsContainer>
          )}
          {selectedWallet && (
            <ActionsContainer
              onPress={() => {
                showModal('walletSelector');
              }}>
              <SelectedOptionContainer style={{minWidth: 120}}>
                <SelectedOptionCol>
                  {walletData && (
                    <CoinIconContainer>
                      <CurrencyImage img={walletData.img} size={20} />
                    </CoinIconContainer>
                  )}
                  <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                    {selectedWallet.credentials.coin.toUpperCase()}
                  </SelectedOptionText>
                </SelectedOptionCol>
                <ArrowContainer>
                  <SelectorArrowDown
                    {...{
                      width: 13,
                      height: 13,
                      color: theme.dark ? 'white' : '#252525',
                    }}
                  />
                </ArrowContainer>
              </SelectedOptionContainer>
              <SelectedOptionCol>
                <DataText>{selectedWallet.currencyName}</DataText>
                <ArrowContainer>
                  <SelectorArrowRight
                    {...{
                      width: 13,
                      height: 13,
                      color: theme.dark ? 'white' : '#9ba3ae',
                    }}
                  />
                </ArrowContainer>
              </SelectedOptionCol>
            </ActionsContainer>
          )}
        </BuyCryptoItemCard>

        <BuyCryptoItemCard>
          <BuyCryptoItemTitle>Payment Method</BuyCryptoItemTitle>
          {!selectedPaymentMethod && (
            <ActionsContainer
              onPress={() => {
                showModal('paymentMethod');
              }}>
              <SelectedOptionContainer style={{backgroundColor: Action}}>
                <SelectedOptionText
                  style={{color: White}}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}>
                  Select Payment Method
                </SelectedOptionText>
                <ArrowContainer>
                  <SelectorArrowDown
                    {...{width: 13, height: 13, color: 'white'}}
                  />
                </ArrowContainer>
              </SelectedOptionContainer>
            </ActionsContainer>
          )}
          {selectedPaymentMethod && (
            <ActionsContainer
              onPress={() => {
                showModal('paymentMethod');
              }}>
              <DataText>{selectedPaymentMethod.label}</DataText>
              {selectedPaymentMethod && selectedPaymentMethod.imgSrc}
            </ActionsContainer>
          )}
        </BuyCryptoItemCard>

        <CtaContainer>
          <Button
            buttonStyle={'primary'}
            disabled={!selectedWallet || !amount}
            onPress={() => {
              navigation.navigate('BuyCrypto', {
                screen: 'BuyCryptoOffers',
                params: {
                  amount,
                  fiatCurrency: 'USD',
                  coin: selectedWallet?.currencyAbbreviation || '',
                  country,
                  selectedWallet,
                  paymentMethod: selectedPaymentMethod,
                },
              });
            }}>
            View Offers
          </Button>
        </CtaContainer>
      </ScrollView>

      <AmountModal
        openedFrom={'buyCrypto'}
        isVisible={amountModalVisible}
        onDismiss={(newAmount?: number) => {
          console.log(
            'Dismissing Amount Modal and setting new amount: ',
            newAmount,
          );
          if (newAmount) {
            setAmount(newAmount);
          }
          setAmountModalVisible(false);
        }}
      />

      <WalletSelectorModal
        onPress={wallet => {
          hideModal('walletSelector');
          setWallet(wallet);
        }}
        isVisible={walletSelectorModalVisible}
        onBackdropPress={() => hideModal('walletSelector')}
      />

      <PaymentMethodsModal
        onPress={paymentMethod => {
          setSelectedPaymentMethod(paymentMethod);
          hideModal('paymentMethod');
        }}
        isVisible={paymentMethodModalVisible}
        onBackdropPress={() => hideModal('paymentMethod')}
        selectedPaymentMethod={selectedPaymentMethod}
      />
    </>
  );
};

export default BuyCryptoRoot;
