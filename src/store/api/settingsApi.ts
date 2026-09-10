import { baseApi } from './baseApi';

export type LegalDocumentKey = 'terms-and-conditions' | 'privacy-policy' | 'about-us';

export interface LegalDocument {
  key: string;
  content: string;
  updatedAt: string | null;
}

/**
 * The legal pages, served by the API.
 *
 * Fetched rather than bundled so a wording change reaches every installed app
 * without a release - for a privacy policy that is not a nicety.
 */
export const settingsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getLegalDocument: builder.query<LegalDocument, LegalDocumentKey>({
      query: key => ({ url: `/settings/${key}` }),
      transformResponse: (response: any, _meta, key): LegalDocument => {
        const data = response?.data ?? response ?? {};
        return {
          key: String(data.key ?? key),
          content: typeof data.content === 'string' ? data.content : '',
          updatedAt: data.updatedAt ?? null,
        };
      },
    }),
  }),
});

export const { useGetLegalDocumentQuery } = settingsApi;
