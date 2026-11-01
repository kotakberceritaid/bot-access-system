const { clients, send, getCaller } = require('./_lib');

module.exports = async function (req, res) {
  try {
    const { admin } = clients();
    const c = await getCaller(req, admin);

    if (c.error) {
      return send(res, c.status, { message: c.error });
    }

    const a = String(req.query.action || '');

    if (
      ['admins', 'create-admin', 'toggle-admin'].includes(a) &&
      c.role !== 'owner'
    ) {
      return send(res, 403, { message: 'Owner role required.' });
    }

    if (req.method === 'GET') {
      if (a === 'me') {
        return send(res, 200, {
          user_id: c.user.id,
          email: c.user.email,
          role: c.role
        });
      }

      if (a === 'overview') {
        const [b, act, ad] = await Promise.all([
          admin.from('bot_access').select('*', { count: 'exact', head: true }),
          admin.from('bot_access').select('*', { count: 'exact', head: true }).eq('active', true),
          admin.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'admin').eq('active', true)
        ]);

        if (b.error || act.error || ad.error) {
          return send(res, 500, { message: 'Overview query failed; check schema.' });
        }

        return send(res, 200, {
          botCount: b.count || 0,
          activeCount: act.count || 0,
          adminCount: ad.count || 0
        });
      }

      if (a === 'bots') {
        const { data, error } = await admin
          .from('bot_access')
          .select('id,number,active,created_at')
          .order('created_at', { ascending: false });

        if (error) return send(res, 500, { message: error.message });
        return send(res, 200, { bots: data || [] });
      }

      if (a === 'admins') {
        const { data, error } = await admin
          .from('user_roles')
          .select('user_id,email,role,active')
          .order('email');

        if (error) return send(res, 500, { message: error.message });
        return send(res, 200, { admins: data || [] });
      }

      return send(res, 400, { message: 'Unknown action.' });
    }

    if (req.method !== 'POST') {
      return send(res, 405, { message: 'Method not allowed.' });
    }

    const b = req.body || {};

    if (a === 'add-bot') {
      const number = String(b.number || '').replace(/\D/g, '');

      if (!/^\d{8,16}$/.test(number)) {
        return send(res, 400, { message: 'Number must contain 8–16 digits.' });
      }

      const { data, error } = await admin
        .from('bot_access')
        .insert({ number, active: b.active !== false })
        .select()
        .single();

      if (error) {
        return send(res, error.code === '23505' ? 409 : 500, {
          message: error.code === '23505'
            ? 'Number already exists.'
            : error.message
        });
      }

      return send(res, 201, { bot: data });
    }

    if (a === 'toggle-bot') {
      const { data, error } = await admin
        .from('bot_access')
        .update({ active: b.active === true })
        .eq('id', b.id)
        .select()
        .maybeSingle();

      if (error) return send(res, 500, { message: error.message });
      if (!data) return send(res, 404, { message: 'Bot not found.' });

      return send(res, 200, { bot: data });
    }

    if (a === 'delete-bot') {
      const { error } = await admin
        .from('bot_access')
        .delete()
        .eq('id', b.id);

      if (error) return send(res, 500, { message: error.message });
      return send(res, 200, { success: true });
    }

    if (a === 'create-admin') {
      const username = String(b.username || b.email || '').trim().toLowerCase();
      const name = String(b.name || '').trim();
      const password = String(b.password || '');

      if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
        return send(res, 400, {
          message: 'Username must be 3–30 characters: letters, numbers, dot, underscore, or hyphen.'
        });
      }

      if (!name || name.length > 80) {
        return send(res, 400, {
          message: 'Display name is required (maximum 80 characters).'
        });
      }

      if (password.length < 12 || password.length > 128) {
        return send(res, 400, {
          message: 'Password must be 12–128 characters.'
        });
      }

      const email = `${username}@admin.id`;

      const { data: u, error: ie } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: name,
          username
        }
      });

      if (ie) {
        const duplicate = /already|registered|exists/i.test(ie.message || '');

        return send(res, duplicate ? 409 : 400, {
          message: duplicate
            ? 'This username is already registered.'
            : 'Could not create Admin account. Check the input and Supabase Auth settings.'
        });
      }

      if (!u.user) {
        return send(res, 500, {
          message: 'Supabase did not return the created account.'
        });
      }

      const { error: re } = await admin.from('user_roles').insert({
        user_id: u.user.id,
        email,
        role: 'admin',
        active: true
      });

      if (re) {
        await admin.auth.admin.deleteUser(u.user.id);

        return send(res, 500, {
          message: 'Role assignment failed. The new Auth account was rolled back.'
        });
      }

      return send(res, 201, {
        success: true,
        message: `Admin account created. Login username: ${email}`
      });
    }

    if (a === 'toggle-admin') {
      const id = String(b.user_id || '');

      const { data: t, error: te } = await admin
        .from('user_roles')
        .select('user_id,role')
        .eq('user_id', id)
        .maybeSingle();

      if (te) return send(res, 500, { message: te.message });
      if (!t) return send(res, 404, { message: 'Account not found.' });
      if (t.role === 'owner') {
        return send(res, 403, { message: 'Owner cannot be disabled here.' });
      }

      const { error } = await admin
        .from('user_roles')
        .update({ active: b.active === true })
        .eq('user_id', id);

      if (error) return send(res, 500, { message: error.message });
      return send(res, 200, { success: true });
    }

    return send(res, 400, { message: 'Unknown action.' });
  } catch (e) {
    return send(res, 500, { message: e.message || 'Server error.' });
  }
};
