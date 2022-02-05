import React, {useState} from 'react';
import {View} from 'react-native';
import {Row} from '../styled/Containers';
import TabButton from './TabButton';

interface TabsProps {
  tabs: {
    title: React.ReactNode;
    content: React.ReactNode;
  }[];
}

const Tabs: React.FC<TabsProps> = props => {
  const [activeTabIdx, setActiveIdx] = useState(0);

  if (!props.tabs || !props.tabs.length) {
    return null;
  }

  const tabs = props.tabs.map((t, idx) => ({
    ...t,
    key: 'tab-' + idx,
  }));

  const TabButtons = tabs.map((d, idx) => (
    <TabButton
      key={d.key}
      active={activeTabIdx === idx}
      onPress={() => setActiveIdx(idx)}>
      {d.title}
    </TabButton>
  ));

  return (
    <View>
      <Row>{TabButtons}</Row>

      <View>{tabs[activeTabIdx].content}</View>
    </View>
  );
};

export default Tabs;