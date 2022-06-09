import {useFocusEffect} from '@react-navigation/native';
import React from 'react';
import ReactAppboy, {ContentCard} from 'react-native-appboy-sdk';
import FastImage, {Source} from 'react-native-fast-image';
import {TouchableOpacity} from 'react-native-gesture-handler';
import styled, {useTheme} from 'styled-components/native';
import {
  ActiveOpacity,
  CardContainer,
} from '../../../components/styled/Containers';
import {BaseText} from '../../../components/styled/Text';
import {CardEffects} from '../../../store/card';
import {
  isCaptionedContentCard,
  isClassicContentCard,
} from '../../../utils/braze';
import {useAppDispatch} from '../../../utils/hooks';
import {BoxShadow} from '../../tabs/home/components/Styled';

interface CardOffersProps {
  contentCard: ContentCard;
  userEmail?: string;
}

const ICON_SIZE = 50;

const CardOffersContainer = styled(CardContainer)`
  flex-direction: row;
  min-height: 78px;
  padding-left: 16px;
  padding-right: 16px;
  width: 100%;
`;

const MainColumn = styled.View`
  flex: 1 1 auto;
  padding: 14px 0;
`;

const IconColumn = styled.View`
  flex: 0 0 auto;
  justify-content: center;
  margin-left: 16px;
  padding: 14px 0;
`;

const TitleRow = styled(BaseText)`
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 5px;
`;

const DescriptionRow = styled(BaseText)`
  color: ${({theme}) => theme.colors.description};
  font-size: 12px;
`;

const IconImage = styled(FastImage)`
  height: ${ICON_SIZE}px;
  width: ${ICON_SIZE}px;
`;

const CardOffers: React.VFC<CardOffersProps> = props => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const {contentCard, userEmail} = props;

  let title = 'Card Offers';
  let description = 'Earn cash back when you shop at top retailers.';
  let iconSource: Source | null = null;

  if (
    isCaptionedContentCard(contentCard) ||
    isClassicContentCard(contentCard)
  ) {
    title = contentCard.title;
    description = contentCard.cardDescription;
  }

  if (typeof contentCard.image === 'string') {
    iconSource = {uri: contentCard.image};
  } else {
    iconSource = contentCard.image as any;
  }

  const onPress = () => {
    if (!contentCard.id.startsWith('dev_')) {
      ReactAppboy.logContentCardClicked(contentCard.id);
    }

    dispatch(CardEffects.startOpenDosh(userEmail || ''));
  };

  useFocusEffect(() => {
    if (!contentCard.id.startsWith('dev_')) {
      ReactAppboy.logContentCardImpression(contentCard.id);
    }
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={ActiveOpacity}>
      <CardOffersContainer
        style={{
          ...(theme.dark ? {} : BoxShadow),
        }}>
        <MainColumn>
          <TitleRow>{title}</TitleRow>

          <DescriptionRow>{description}</DescriptionRow>
        </MainColumn>

        {iconSource ? (
          <IconColumn>
            <IconImage source={iconSource} />
          </IconColumn>
        ) : null}
      </CardOffersContainer>
    </TouchableOpacity>
  );
};

export default CardOffers;
