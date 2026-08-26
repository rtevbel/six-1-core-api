export type AcceptInvitationProfile = {
  firstName?: string;
  lastName?: string;
  password?: string;
};

export type InvitationAcceptPreview = {
  email: string;
  tenantName: string;
  roleName: string;
  status: 'pending' | 'accepted' | 'declined';
  expired: boolean;
  requiresAccountSetup: boolean;
};
