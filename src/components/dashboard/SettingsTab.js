import React, { useEffect, useMemo, useState } from 'react';
import Alert from '../common/Alert';
import LoadingSpinner from '../common/LoadingSpinner';

const PROFILE_BUCKET = 'profile-avatars';

const SettingsTab = ({ user, supabase }) => {
  const [profile, setProfile] = useState({
    fullName: user?.user_metadata?.full_name || '',
    username: user?.user_metadata?.username || '',
    email: user?.email || '',
    bio: user?.user_metadata?.bio || '',
    avatarUrl: user?.user_metadata?.avatar_url || ''
  });
  const [identities, setIdentities] = useState(user?.identities || []);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    setProfile({
      fullName: user?.user_metadata?.full_name || '',
      username: user?.user_metadata?.username || '',
      email: user?.email || '',
      bio: user?.user_metadata?.bio || '',
      avatarUrl: user?.user_metadata?.avatar_url || ''
    });
    setIdentities(user?.identities || []);
  }, [user]);

  const googleIdentity = useMemo(
    () => identities?.find((item) => item.provider === 'google'),
    [identities]
  );

  const handleProfileChange = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    if (!supabase) {
      showAlert('Supabase client is not available.', 'error');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        data: {
          full_name: profile.fullName,
          username: profile.username,
          bio: profile.bio,
          avatar_url: profile.avatarUrl
        }
      };

      if (profile.email && profile.email !== user?.email) {
        payload.email = profile.email;
      }

      const { data, error } = await supabase.auth.updateUser(payload);

      if (error) throw error;

      setIdentities(data?.user?.identities || identities);
      showAlert('Profile updated successfully.', 'success');
    } catch (error) {
      showAlert(error.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    if (!supabase) {
      showAlert('Supabase client is not available.', 'error');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const extension = file.name.split('.').pop();
      const fileName = `${user?.id || 'user'}-${Date.now()}.${extension}`;
      const filePath = `${user?.id || 'user'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(PROFILE_BUCKET)
        .upload(filePath, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(PROFILE_BUCKET)
        .getPublicUrl(filePath);

      const newAvatar = publicUrlData?.publicUrl;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: newAvatar }
      });

      if (updateError) throw updateError;

      setProfile((prev) => ({ ...prev, avatarUrl: newAvatar }));
      showAlert('Profile photo updated.', 'success');
    } catch (error) {
      showAlert(error.message || 'Unable to upload profile photo.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const handleLinkGoogle = async () => {
    if (!supabase) {
      showAlert('Supabase client is not available.', 'error');
      return;
    }

    setLinking(true);

    try {
      const { data, error } = await supabase.auth.linkIdentity({ provider: 'google' });
      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      showAlert('Follow the Google flow to finish linking your account.', 'info');
    } catch (error) {
      showAlert(error.message || 'Unable to link Google account.', 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!supabase) {
      showAlert('Supabase client is not available.', 'error');
      return;
    }

    if (!googleIdentity) {
      showAlert('No Google account is linked.', 'warning');
      return;
    }

    setLinking(true);

    try {
      const { error } = await supabase.auth.unlinkIdentity({ identity_id: googleIdentity.id });
      if (error) throw error;

      const { data: refreshed } = await supabase.auth.getUser();
      setIdentities(refreshed?.user?.identities || []);
      showAlert('Google account disconnected.', 'success');
    } catch (error) {
      showAlert(error.message || 'Unable to unlink Google account.', 'error');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="settings-tab">
      {alert && (
        <div className="alert-container">
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      <section className="section">
        <header>
          <h2>Profile details</h2>
          <p>Update the information displayed across your dashboard and widget.</p>
        </header>

        <form className="profile-form" onSubmit={handleProfileSave}>
          <div className="avatar-field">
            <div className="avatar-preview">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" />
              ) : (
                <span className="avatar-placeholder">{user?.email?.[0]?.toUpperCase() || 'A'}</span>
              )}
            </div>
            <label className="upload-btn">
              Change photo
              <input type="file" accept="image/*" onChange={handleAvatarUpload} />
            </label>
          </div>

          <label className="form-control">
            <span>Full name</span>
            <input
              type="text"
              value={profile.fullName}
              onChange={(event) => handleProfileChange('fullName', event.target.value)}
              placeholder="Your name"
            />
          </label>

          <label className="form-control">
            <span>Username</span>
            <input
              type="text"
              value={profile.username}
              onChange={(event) => handleProfileChange('username', event.target.value)}
              placeholder="workspace-handle"
            />
          </label>

          <label className="form-control">
            <span>Email</span>
            <input
              type="email"
              value={profile.email}
              onChange={(event) => handleProfileChange('email', event.target.value)}
              placeholder="name@example.com"
            />
          </label>

          <label className="form-control">
            <span>Bio</span>
            <textarea
              value={profile.bio}
              onChange={(event) => handleProfileChange('bio', event.target.value)}
              placeholder="Tell collaborators about yourself"
              rows={4}
            />
          </label>

          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? (
              <span className="btn-loading">
                <LoadingSpinner size="small" color="white" />
                <span>Saving…</span>
              </span>
            ) : (
              'Save changes'
            )}
          </button>
        </form>
      </section>

      <section className="section">
        <header>
          <h2>Connected accounts</h2>
          <p>Link a Google account for quicker sign-in and calendar integrations.</p>
        </header>

        <div className="connected-card">
          <div>
            <h3>Google</h3>
            <p>{googleIdentity ? 'Google account linked.' : 'No Google account linked yet.'}</p>
          </div>
          <div className="connected-actions">
            {googleIdentity ? (
              <button className="outline-btn" onClick={handleUnlinkGoogle} disabled={linking}>
                {linking ? 'Disconnecting…' : 'Disconnect Google'}
              </button>
            ) : (
              <button className="primary-btn" onClick={handleLinkGoogle} disabled={linking}>
                {linking ? 'Opening…' : 'Link Google account'}
              </button>
            )}
          </div>
        </div>
      </section>

      <style jsx>{`
        .settings-tab {
          display: flex;
          flex-direction: column;
          gap: var(--space-8);
        }

        .alert-container {
          position: sticky;
          top: var(--space-2);
          z-index: 10;
        }

        .section {
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-2xl);
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        .section header h2 {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-semibold);
          margin-bottom: var(--space-1);
        }

        .section header p {
          color: var(--gray-600);
        }

        .profile-form {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: var(--space-4);
          align-items: flex-start;
        }

        .avatar-field {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          align-items: center;
        }

        .avatar-preview {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--gray-100);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-500);
        }

        .avatar-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .upload-btn {
          border: 1px solid var(--gray-300);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-md);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          background: var(--gray-50);
        }

        .upload-btn input {
          display: none;
        }

        .form-control {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .form-control input,
        .form-control textarea {
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          font-size: var(--text-base);
          width: 100%;
        }

        .primary-btn,
        .outline-btn {
          border: none;
          border-radius: var(--radius-md);
          padding: var(--space-2) var(--space-5);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
        }

        .btn-loading {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
        }

        .primary-btn {
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          color: var(--white);
          justify-self: flex-start;
        }

        .primary-btn:disabled,
        .outline-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .outline-btn {
          background: var(--white);
          border: 1px solid var(--gray-300);
          color: var(--gray-700);
        }

        .connected-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-4);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-xl);
          background: var(--gray-50);
        }

        .connected-card h3 {
          font-size: var(--text-lg);
          margin-bottom: var(--space-1);
        }

        .connected-card p {
          color: var(--gray-600);
        }

        .connected-actions {
          display: flex;
          gap: var(--space-3);
        }

        @media (max-width: 768px) {
          .profile-form {
            grid-template-columns: 1fr;
          }

          .connected-card {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default SettingsTab;
