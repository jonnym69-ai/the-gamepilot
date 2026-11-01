import { RecommendationExplainer } from './RecommendationExplainer';
import { GamingIdentity } from '../GamingIdentity';

jest.mock('../GamingIdentity', () => ({
  GamingIdentity: {
    getProfile: jest.fn(() => null),
  },
}));

describe('RecommendationExplainer.getSignatureGameReasoning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('attributes the match to the signature game that actually shares the genre', () => {
    GamingIdentity.getProfile.mockReturnValue({
      signatureGames: [
        { name: 'Project Zomboid', genres: ['Action', 'RPG'] },
        { name: 'Valheim', genres: ['Survival', 'Adventure'] },
      ],
    });
    const reason = RecommendationExplainer.getSignatureGameReasoning({
      name: 'Grounded',
      genres: ['Action', 'Survival'],
    });
    expect(reason).toBe('Shares Survival with Valheim, one of your most-played games.');
  });

  test('returns null when only generic genres overlap', () => {
    GamingIdentity.getProfile.mockReturnValue({
      signatureGames: [{ name: 'Project Zomboid', genres: ['Action', 'RPG'] }],
    });
    expect(
      RecommendationExplainer.getSignatureGameReasoning({
        name: 'Other',
        genres: ['Action', 'RPG', 'Strategy'],
      })
    ).toBe(null);
  });

  test('excludes the candidate itself from signature matches', () => {
    GamingIdentity.getProfile.mockReturnValue({
      signatureGames: [{ name: 'Project Zomboid', genres: ['Survival'] }],
    });
    expect(
      RecommendationExplainer.getSignatureGameReasoning({
        name: 'Project Zomboid',
        genres: ['Survival'],
      })
    ).toBe(null);
  });

  test('a meaningful match names the specific genres and the signature title', () => {
    GamingIdentity.getProfile.mockReturnValue({
      signatureGames: [{ name: 'Project Zomboid', genres: ['Survival', 'Horror', 'RPG'] }],
    });
    const reason = RecommendationExplainer.getSignatureGameReasoning({
      name: 'Other',
      genres: ['Survival', 'Horror'],
    });
    expect(reason).toContain('Survival and Horror');
    expect(reason).toContain('Project Zomboid');
  });
});
