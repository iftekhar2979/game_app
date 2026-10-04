import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'lucide-react-native';
import DatePicker from 'react-native-date-picker';
import PrimaryButton from '../Button/PrimaryButton';
import { ageFromBirthDate } from '../../utils/ageGate';

type Props = {
  onEligible: (dateOfBirth: string) => void;
};

/** No preselected adult birth date and no personal details before age screening. */
export default function BirthDateGate({ onEligible }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [needsParent, setNeedsParent] = useState(false);

  const submit = () => {
    if (!selectedDate) {
      setError('Select your date of birth.');
      return;
    }
    const dateOfBirth = [
      selectedDate.getFullYear(),
      String(selectedDate.getMonth() + 1).padStart(2, '0'),
      String(selectedDate.getDate()).padStart(2, '0'),
    ].join('-');
    const age = ageFromBirthDate(dateOfBirth);
    if (age === null) {
      setError('Select a valid date of birth.');
      return;
    }
    setError('');
    if (age < 13) {
      setNeedsParent(true);
      return;
    }
    onEligible(dateOfBirth);
  };

  if (needsParent) {
    return (
      <View className="px-6 py-6" accessibilityRole="text">
        <Text className="text-white text-xl font-bold mb-3">Ask a parent or guardian</Text>
        <Text className="text-[#A3A3A3] text-sm leading-5">
          A parent or guardian needs to help set up an account for younger players. Account creation is unavailable right now.
        </Text>
      </View>
    );
  }

  return (
    <View className="px-6 py-4">
      <Text className="text-white text-xl font-bold mb-2">When were you born?</Text>
      <Text className="text-[#A3A3A3] text-sm mb-5">Select your date of birth to continue.</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Date of birth"
        activeOpacity={0.8}
        onPress={() => setPickerOpen(true)}
        className={`flex-row items-center bg-black border ${error ? 'border-red-500' : 'border-[#3A144E]'} rounded-xl px-4 py-4 mb-3`}
      >
        <View className="mr-3 opacity-60"><Calendar color="#A3A3A3" size={20} /></View>
        <Text className={`flex-1 text-base ${selectedDate ? 'text-white' : 'text-[#666666]'}`}>
          {selectedDate ? selectedDate.toLocaleDateString() : 'Date of birth'}
        </Text>
      </TouchableOpacity>
      {!!error && <Text className="text-red-500 text-sm mb-3">{error}</Text>}
      <PrimaryButton title="Continue" onPress={submit} />
      <DatePicker
        modal
        open={pickerOpen}
        date={selectedDate ?? new Date()}
        mode="date"
        maximumDate={new Date()}
        minimumDate={new Date(1900, 0, 1)}
        theme="dark"
        onConfirm={date => {
          setPickerOpen(false);
          setSelectedDate(date);
          setError('');
        }}
        onCancel={() => setPickerOpen(false)}
      />
    </View>
  );
}
