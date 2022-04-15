import {StackScreenProps} from '@react-navigation/stack';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView} from 'react-native';
import Animated, {Easing, FadeInDown} from 'react-native-reanimated';
import Carousel from 'react-native-snap-carousel';
import {SharedElement} from 'react-navigation-shared-element';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {ScreenGutter, WIDTH} from '../../../components/styled/Containers';
import {CARD_WIDTH} from '../../../constants/config.card';
import {Card} from '../../../store/card/card.models';
import {selectCardGroups} from '../../../store/card/card.selectors';
import {useAppSelector} from '../../../utils/hooks';
import {CardStackParamList} from '../CardStack';
import SettingsList from '../components/CardSettingsList';
import SettingsSlide from '../components/CardSettingsSlide';

export type CardSettingsParamList = {
  id: string;
};

type CardSettingsProps = StackScreenProps<CardStackParamList, 'Settings'>;

const CardSettingsContainer = styled.View`
  padding: 0 ${ScreenGutter} ${ScreenGutter};
`;

const CardSettingsHeader = styled.View`
  align-content: center;
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-bottom: ${ScreenGutter};
`;

const CardTypeButtons = styled.View`
  display: flex;
  flex-direction: row;
  flex-grow: 0;
`;

const CardSettings: React.FC<CardSettingsProps> = ({navigation, route}) => {
  const {id} = route.params;
  const {t} = useTranslation();
  const carouselRef = useRef<Carousel<Card>>(null);
  const currentGroup = useAppSelector(selectCardGroups).find(g =>
    g.some(c => c.id === id),
  );
  const [cardsToShow, virtualCard, physicalCard] = useMemo(() => {
    const cards: Card[] = [];
    let virtual: Card | undefined;
    let physical: Card | undefined;

    if (currentGroup) {
      virtual = currentGroup.find(c => c.cardType === 'virtual');
      physical = currentGroup.find(c => c.cardType === 'physical');

      if (virtual) {
        cards.push(virtual);
      }

      if (physical) {
        cards.push(physical);
      }
    }

    return [cards, virtual, physical];
  }, [currentGroup]);

  const initialIdx = Math.max(
    0,
    cardsToShow.findIndex(c => c.id === id),
  );
  const [activeCard, setActiveCard] = useState(cardsToShow[initialIdx]);

  const onCardChange = (idx: number) => {
    const nextCard = cardsToShow[idx];

    if (nextCard.cardType) {
      setActiveCard(nextCard);
    }
  };

  const onVirtualPress = useCallback(() => {
    if (virtualCard) {
      setActiveCard(virtualCard);
      carouselRef.current?.snapToItem(0);
    }
  }, [virtualCard]);

  const onPhysicalPress = useCallback(() => {
    if (physicalCard) {
      setActiveCard(physicalCard);
      carouselRef.current?.snapToItem(1);
    }
  }, [physicalCard]);

  const renderSettingsSlide = useCallback(
    ({item}: {item: Card}) => {
      const isVirtual = item.cardType === 'virtual' || cardsToShow.length < 2;
      const sharedTransitionId = isVirtual ? 'card.dashboard.active-card' : '';

      return isVirtual ? (
        <SharedElement id={sharedTransitionId}>
          <SettingsSlide card={item} />
        </SharedElement>
      ) : (
        <SettingsSlide card={item} />
      );
    },
    [cardsToShow.length],
  );

  return (
    <ScrollView>
      <CardSettingsContainer>
        <CardSettingsHeader>
          {virtualCard && physicalCard ? (
            <CardTypeButtons>
              <Button
                onPress={onVirtualPress}
                buttonType="pill"
                buttonStyle={
                  activeCard.cardType === 'virtual' ? 'primary' : 'secondary'
                }>
                {t('Virtual')}
              </Button>

              <Button
                onPress={onPhysicalPress}
                buttonType="pill"
                buttonStyle={
                  activeCard.cardType === 'physical' ? 'primary' : 'secondary'
                }>
                {t('Physical')}
              </Button>
            </CardTypeButtons>
          ) : null}
        </CardSettingsHeader>
      </CardSettingsContainer>
      <Carousel<Card>
        ref={carouselRef}
        data={cardsToShow}
        vertical={false}
        firstItem={initialIdx}
        itemWidth={CARD_WIDTH}
        sliderWidth={WIDTH}
        renderItem={renderSettingsSlide}
        onScrollIndexChanged={onCardChange}
        layout="default"
      />

      <CardSettingsContainer>
        {cardsToShow.map(c => {
          const isActive = c.id === activeCard.id;
          const delay = 150;
          const duration = 250;
          const easing = Easing.linear;

          const useTransition = cardsToShow.length > 1;
          const transitionEnter = useTransition
            ? FadeInDown.duration(duration).delay(delay).easing(easing)
            : undefined;

          return isActive ? (
            <Animated.View key={c.id} entering={transitionEnter}>
              <SettingsList card={c} navigation={navigation} />
            </Animated.View>
          ) : null;
        })}
      </CardSettingsContainer>
    </ScrollView>
  );
};

export default CardSettings;
