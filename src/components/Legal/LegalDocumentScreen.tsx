import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import {
  LegalDocumentKey,
  useGetLegalDocumentQuery,
} from '../../store/api/settingsApi';
import { LegalInline, parseLegalDocument } from '../../utils/legalMarkdown';
import { SkeletonRegion, SkeletonText, Skeleton } from '../Skeleton';

interface Props {
  documentKey: LegalDocumentKey;
  title: string;
}

/**
 * One legal page - Terms, Privacy or About - read from the API.
 *
 * The three screens were hard-coded lorem ipsum. They now show whatever an
 * admin has published, so the wording can change without an app release.
 */
export default function LegalDocumentScreen({ documentKey, title }: Props) {
  const navigation = useNavigation();
  const { data, isLoading, isError, refetch, isFetching } =
    useGetLegalDocumentQuery(documentKey);

  const blocks = useMemo(() => parseLegalDocument(data?.content), [data?.content]);

  // The document's own first heading repeats the screen title; drop it.
  const body =
    blocks[0]?.kind === 'heading' &&
    blocks[0].text.toLowerCase().includes(title.toLowerCase().split(' ')[0])
      ? blocks.slice(1)
      : blocks;

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-center px-6 pt-2 pb-6 relative">
        <TouchableOpacity
          className="absolute left-6 top-2 w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-transparent z-10"
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-semibold mt-3">{title}</Text>
      </View>

      {isLoading ? (
        <SkeletonRegion label={`Loading ${title}`} style={{ paddingHorizontal: 24 }}>
          <Skeleton width="55%" height={18} radius={9} style={{ marginBottom: 16 }} />
          <SkeletonText lines={4} lineHeight={12} style={{ marginBottom: 24 }} />
          <Skeleton width="40%" height={16} radius={8} style={{ marginBottom: 14 }} />
          <SkeletonText lines={3} lineHeight={12} />
        </SkeletonRegion>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-white text-[16px] font-semibold text-center">
            Could not load this page
          </Text>
          <Text className="text-gray-400 text-[13px] text-center mt-2">
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            className="mt-5 bg-[#E0B566] px-6 py-3 rounded-xl"
            onPress={() => refetch()}
            disabled={isFetching}
            accessibilityRole="button"
          >
            <Text className="text-black font-semibold">
              {isFetching ? 'Loading...' : 'Try again'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : !body.length ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-gray-400 text-[14px] text-center">
            This page has not been published yet.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          {body.map((block, index) => {
            if (block.kind === 'heading') {
              return (
                <Text
                  key={index}
                  accessibilityRole="header"
                  className="text-white text-[16px] font-bold mt-6 mb-2"
                >
                  {block.text}
                </Text>
              );
            }

            if (block.kind === 'bullet') {
              return (
                <View key={index} className="flex-row mb-2 pr-2">
                  <Text className="text-[#E0B566] text-[14px] leading-6 w-5">
                    {block.marker}
                  </Text>
                  <Text className="text-gray-300 text-[14px] leading-6 flex-1">
                    <Inlines parts={block.inlines} />
                  </Text>
                </View>
              );
            }

            return (
              <Text key={index} className="text-gray-300 text-[14px] leading-6 mb-3">
                <Inlines parts={block.inlines} />
              </Text>
            );
          })}

          {data?.updatedAt ? (
            <Text className="text-gray-600 text-[12px] mt-8">
              Last updated {new Date(data.updatedAt).toLocaleDateString()}
            </Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Inlines({ parts }: { parts: LegalInline[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.bold ? (
          <Text key={index} className="text-white font-semibold">
            {part.text}
          </Text>
        ) : (
          <Text key={index}>{part.text}</Text>
        ),
      )}
    </>
  );
}
