import request from 'supertest';
import app from '../src/app';

describe('Auth integration', () => {
  const unique = Date.now();
  const email = `test+${unique}@example.com`;
  const password = 'supersecretpassword';

  let loginCookie: string | undefined;

  test('register sets refresh cookie and returns accessToken', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email, password, name: 'Test User' })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    // server should set httpOnly refresh cookie
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    // capture cookie for later
    loginCookie = Array.isArray(setCookie) ? setCookie[0].split(';')[0] : (setCookie as string).split(';')[0];
  });

  test('login returns accessToken and sets refresh cookie', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    loginCookie = Array.isArray(setCookie) ? setCookie[0].split(';')[0] : (setCookie as string).split(';')[0];
  });

  test('refresh using httpOnly cookie returns new accessToken and rotates cookie', async () => {
    expect(loginCookie).toBeDefined();
    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', loginCookie as string)
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    // new cookie should be present (rotation)
    const newCookie = Array.isArray(setCookie) ? setCookie[0].split(';')[0] : (setCookie as string).split(';')[0];
    expect(newCookie).not.toBe(loginCookie);
    loginCookie = newCookie;
  });

  test('logout revokes token and clears cookie', async () => {
    expect(loginCookie).toBeDefined();
    const res = await request(app)
      .post('/auth/logout')
      .set('Cookie', loginCookie as string)
      .expect(204);

    // logout should clear cookie (set-cookie with the same name and an expired value)
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
  });
});
