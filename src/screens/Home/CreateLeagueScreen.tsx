import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Image, Modal, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { ChevronLeft, Upload, User, Users, ChevronDown, Calendar, Clock } from 'lucide-react-native';
import DatePicker from 'react-native-date-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useDispatch } from 'react-redux';
import { createLeague } from '../../store/slices/leagueSlice';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CreateLeagueScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();

  const [leagueName, setLeagueName] = useState('');
  const [memberCount, setMemberCount] = useState('10'); // Default or placeholder
  const [logoUri, setLogoUri] = useState<string | undefined>();
  const [draftDate, setDraftDate] = useState<Date | null>(null);
  const [draftTime, setDraftTime] = useState<Date | null>(null);
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [openTimePicker, setOpenTimePicker] = useState(false);
  const [isMemberModalVisible, setIsMemberModalVisible] = useState(false);

  const formatDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month} - ${day} - ${year}`;
  };

  const formatTimeStr = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const memberOptions = ['2', '4', '6', '8', '10', '12', '14', '16', '18', '20'];

  const handleSelectImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.assets && result.assets.length > 0) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleCreateLeague = () => {
    if (!leagueName.trim()) {
      Alert.alert('Required', 'Please enter a league name');
      return;
    }

    const newLeague = {
      id: Date.now().toString(),
      name: leagueName,
      membersCount: parseInt(memberCount, 10) || 0,
      logoUri,
      draftDate: draftDate ? draftDate.toISOString() : undefined,
      draftTime: draftTime ? draftTime.toISOString() : undefined,
      createdAt: Date.now(),
    };

    dispatch(createLeague(newLeague));

    // Navigate back to the Fantasy League screen
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View className="flex-row items-center px-5 pt-2.5 pb-6">
          <TouchableOpacity
            className="w-11 h-11 rounded-xl border border-[#333] justify-center items-center mr-4"
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-[22px] font-semibold">Create League</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10 }} keyboardShouldPersistTaps="handled">

          {/* Upload Logo Area */}
          <TouchableOpacity className="h-40 border border-[#B366FF] rounded-[20px] justify-center items-center bg-[#0a0a0a] mb-6" activeOpacity={0.8} onPress={handleSelectImage}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} className="w-full h-full rounded-[20px]" />
            ) : (
              <>
                <View className="w-10 h-10 rounded-xl border border-[#B366FF] justify-center items-center mb-3">
                  <Upload color="#fff" size={20} />
                </View>
                <Text className="text-[#ccc] text-base">Upload league logo</Text>
              </>
            )}
          </TouchableOpacity>

          {/* League Name Input */}
          <View className="flex-row items-center border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[60px] px-4 mb-4">
            <User color="#999" size={20} style={{ marginRight: 12 }} />
            <TextInput
              className="flex-1 text-white text-base h-full"
              placeholder="League name"
              placeholderTextColor="#999"
              value={leagueName}
              onChangeText={setLeagueName}
              autoCapitalize="words"
            />
          </View>

          {/* Members Dropdown */}
          <TouchableOpacity className="flex-row items-center border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[60px] px-4 mb-6" activeOpacity={0.8} onPress={() => setIsMemberModalVisible(true)}>
            <Users color="#999" size={20} style={{ marginRight: 12 }} />
            <Text className={`flex-1 text-base ${memberCount ? 'text-white' : 'text-[#999]'}`}>
              {memberCount ? `${memberCount} Member of teams` : 'Member of teams'}
            </Text>
            <ChevronDown color="#999" size={20} style={{ marginLeft: 12 }} />
          </TouchableOpacity>

          {/* Set Draft Date */}
          <Text className="text-[#ccc] text-base mb-2">Set draft date</Text>
          <TouchableOpacity
            className="flex-row items-center border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[60px] px-4 mb-4"
            activeOpacity={0.8}
            onPress={() => setOpenDatePicker(true)}
          >
            <Text className={`flex-1 text-base ${draftDate ? 'text-white' : 'text-[#555]'}`}>
              {draftDate ? formatDate(draftDate) : 'Ex: 06 - 29 - 2025'}
            </Text>
            <Calendar color="#999" size={20} />
          </TouchableOpacity>

          {/* Set Draft Time */}
          <Text className="text-[#ccc] text-base mb-2">Set draft time</Text>
          <TouchableOpacity
            className="flex-row items-center border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[60px] px-4 mb-6"
            activeOpacity={0.8}
            onPress={() => setOpenTimePicker(true)}
          >
            <Text className={`flex-1 text-base ${draftTime ? 'text-white' : 'text-[#555]'}`}>
              {draftTime ? formatTimeStr(draftTime) : 'Ex: 11:00 AM'}
            </Text>
            <Clock color="#999" size={20} />
          </TouchableOpacity>

        </ScrollView>

        {/* Bottom Button */}
        <View className="px-5 pb-[30px] pt-2.5">
          <TouchableOpacity
            className="bg-[#8B3DFF] rounded-[30px] h-14 justify-center items-center"
            activeOpacity={0.8}
            onPress={handleCreateLeague}
          >
            <Text className="text-white text-base font-semibold">Create league</Text>
          </TouchableOpacity>
        </View>

        {/* Members Modal */}
        <Modal
          visible={isMemberModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsMemberModalVisible(false)}
        >
          <TouchableOpacity
            className="flex-1 bg-black/50 justify-center items-center"
            activeOpacity={1}
            onPress={() => setIsMemberModalVisible(false)}
          >
            <View className="bg-[#1a1a1a] rounded-2xl w-4/5 max-h-[60%] p-5 border border-[#333]">
              <Text className="text-white text-lg font-semibold mb-4 text-center">Select Members</Text>
              <FlatList
                data={memberOptions}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="py-3 border-b border-[#333] items-center"
                    onPress={() => {
                      setMemberCount(item);
                      setIsMemberModalVisible(false);
                    }}
                  >
                    <Text className={`text-base ${memberCount === item ? 'text-[#B366FF] font-semibold' : 'text-[#999]'}`}>
                      {item} Members
                    </Text>
                  </TouchableOpacity>
                )}
                className="grow-0"
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Date Picker Modal */}
        <DatePicker
          modal
          open={openDatePicker}
          date={draftDate || new Date()}
          mode="date"
          theme="dark"
          onConfirm={(date) => {
            setOpenDatePicker(false);
            setDraftDate(date);
          }}
          onCancel={() => {
            setOpenDatePicker(false);
          }}
        />

        {/* Time Picker Modal */}
        <DatePicker
          modal
          open={openTimePicker}
          date={draftTime || new Date()}
          mode="time"
          theme="dark"
          onConfirm={(date) => {
            setOpenTimePicker(false);
            setDraftTime(date);
          }}
          onCancel={() => {
            setOpenTimePicker(false);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
