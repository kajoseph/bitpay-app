import React from 'react';
import styled from 'styled-components/native';
import ProtectCrypto from '../../../../assets/img/onboarding/protect-crypto.svg';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {
  CtaContainer,
  ImageContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';

const BackupContainer = styled.SafeAreaView`
  flex: 1;
  align-items: center;
`;

const BackupScreen = () => {
  useAndroidBackHandler(() => true);
  const navigation = useNavigation();
  const {id, mnemonic} = useSelector(({WALLET}: RootState) => WALLET.keys[0]);
  const gotoBackup = () =>
    navigation.navigate('Onboarding', {
      screen: 'RecoveryPhrase',
      params: {
        keyId: id,
        words: mnemonic.trim().split(' '),
        isOnboarding: true,
      },
    });

  return (
    <BackupContainer>
      <ImageContainer>
        <ProtectCrypto />
      </ImageContainer>
      <TitleContainer>
        <TextAlign align={'center'}>
          <H3>Would you like to backup your wallet?</H3>
        </TextAlign>
      </TitleContainer>
      <TextContainer>
        <TextAlign align={'center'}>
          <Paragraph>
            If you delete the BitPay app or lose your device, you’ll need your
            recovery phrase regain access to your funds.
          </Paragraph>
        </TextAlign>
      </TextContainer>
      <CtaContainer>
        <Button buttonStyle={'primary'} onPress={gotoBackup}>
          Backup your Recovery Phrase
        </Button>
      </CtaContainer>
    </BackupContainer>
  );
};

export default BackupScreen;