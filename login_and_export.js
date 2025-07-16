// login_and_export.js
import fs from 'node:fs/promises';
import fssync from 'fs';
import path from 'node:path';
import { connect } from 'puppeteer-real-browser';
import dotenv from 'dotenv';
dotenv.config();


console.log('USER:', process.env.EW_USER);
console.log('PASS:', process.env.EW_PASS);


// Windows Chrome路径，如果路径不同请修改
const chromePath = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
// Chrome driver路径
const chromeDriverPath = path.join(process.cwd(), '..', 'chromedriver.exe');
const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');


const CREDS = {
  user: process.env.EW_USER,
  pass: process.env.EW_PASS,
};


(async () => {
  await fs.mkdir(path.join(process.cwd(), 'chrome-data'), { recursive: true });
  
  // 全局异常处理
  process.on('unhandledRejection', (reason, promise) => {
    console.log('❌ 未处理的Promise拒绝:', reason);
    process.exit(1);
  });
  
  process.on('uncaughtException', (error) => {
    console.log('❌ 未捕获的异常:', error);
    process.exit(1);
  });
  
  const { browser, page } = await connect({
    headless: process.env.NODE_ENV === 'production' ? true : false,
    turnstile: true,
    customConfig: {
      chromePath,
      userDataDir: path.join(process.cwd(), 'chrome-data'),
      executablePath: chromeDriverPath,
    },
    connectOption: {
      defaultViewport: null,
    },
  });

  // 先访问 class-list.aspx
  console.log('🧭 正在前往 class-list.aspx...');
  await page.goto('https://www.enrollware.com/admin/class-list.aspx', { waitUntil: 'domcontentloaded' });

  // 判断是否需要登录
  const needLogin = await page.$('input[name="username"]') !== null;
  if (needLogin) {
    console.log('⌨️ 需要登录，输入用户名和密码...');
    // 优先模拟粘贴输入用户名
    await page.click('input[name="username"]');
    await page.evaluate((val) => {
      const input = document.querySelector('input[name="username"]');
      input.value = '';
      input.focus();
      input.dispatchEvent(new Event('focus'));
      input.dispatchEvent(new Event('click'));
      input.value = val;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, CREDS.user);
    // 检查粘贴后内容是否正确，否则用逐字符输入兜底
    let usernameValue = await page.$eval('input[name="username"]', el => el.value);
    if (usernameValue !== CREDS.user) {
      await page.click('input[name="username"]');
      await page.evaluate(() => { document.querySelector('input[name="username"]').value = ''; });
      for (let i = 0; i < CREDS.user.length; i++) {
        await page.keyboard.type(CREDS.user[i], { delay: 120 });
        await new Promise(r => setTimeout(r, 150));
      }
    }
    // 优先模拟粘贴输入密码
    await page.click('input[name="password"]');
    await page.evaluate((val) => {
      const input = document.querySelector('input[name="password"]');
      input.value = '';
      input.focus();
      input.dispatchEvent(new Event('focus'));
      input.dispatchEvent(new Event('click'));
      input.value = val;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, CREDS.pass);
    // 检查粘贴后内容是否正确，否则用逐字符输入兜底
    let passwordValue = await page.$eval('input[name="password"]', el => el.value);
    if (passwordValue !== CREDS.pass) {
      await page.click('input[name="password"]');
      await page.evaluate(() => { document.querySelector('input[name="password"]').value = ''; });
      for (let i = 0; i < CREDS.pass.length; i++) {
        await page.keyboard.type(CREDS.pass[i], { delay: 150 });
        await new Promise(r => setTimeout(r, 180));
      }
    }
    // 输入完后点击页面空白处，触发失焦
    await page.mouse.click(10, 10);
    console.log('⏳ 等待一下再点击登录...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('🔘 点击登录按钮...');
    await page.realClick('input[type="submit"]');
    console.log('🛡️ 等待跳转页面...');
    try {
      await page.waitForNavigation({ timeout: 60000, waitUntil: 'domcontentloaded' });
    } catch (e) {
      console.log('⚠️ 页面跳转超时，检查当前页面状态...');
      await page.screenshot({ path: 'error.png' });
      const currentURL = page.url();
      console.log('当前页面URL:', currentURL);
      await browser.close();
      process.exit(1);
    }
    const currentURL = page.url();
    console.log('📍 当前页面URL:', currentURL);
    if (!currentURL.includes('class-list.aspx')) {
      console.log('❌ 登录失败，停止执行');
      await page.screenshot({ path: 'error.png' });
      await browser.close();
      process.exit(1);
    }
    console.log('✅ 登录成功!');
  } else {
    console.log('✅ 已登录，无需再次登录!');
  }

  console.log('📄 正在跳转到导出页面...');
  await page.goto('https://www.enrollware.com/admin/student-export.aspx', { waitUntil: 'domcontentloaded' });

  // 等待页面关键元素渲染出来
  await page.waitForSelector('select[name="ctl00$mainContent$regdateType"]', { visible: true, timeout: 10000 });
  await page.waitForSelector('select[name="ctl00$mainContent$dateType"]', { visible: true, timeout: 10000 });

  // 自动选择下拉框和填写日期
  // 日期变量只声明一次
  const today = new Date();
  const endDate = `${today.getMonth()+1}/${today.getDate()}/${today.getFullYear()}`;
  const startObj = new Date();
  startObj.setDate(today.getDate() - 30);
  const startDate = `${startObj.getMonth()+1}/${startObj.getDate()}/${startObj.getFullYear()}`;

  // 1. 选择第一个下拉框为 Class Start Dates
  await page.select('select[name="ctl00$mainContent$regdateType"]', 'startTime');
  await page.evaluate(() => {
    document.querySelector('select[name="ctl00$mainContent$regdateType"]').dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 800));

  // 2. 选择第二个下拉框为 Custom Range
  await page.select('select[name="ctl00$mainContent$dateType"]', 'Custom Range');
  await page.evaluate(() => {
    document.querySelector('select[name="ctl00$mainContent$dateType"]').dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 1200));

  // 打印所有input的name，便于调试
  const allInputs = await page.$$eval('input', xs => xs.map(x => x.getAttribute('name')));
  console.log('所有input的name:', allInputs);

  // 再等待日期输入框出现
  await page.waitForSelector('input[name="ctl00$mainContent$sdate"]', { visible: true, timeout: 10000 });
  await page.waitForSelector('input[name="ctl00$mainContent$edate"]', { visible: true, timeout: 10000 });
  // 3. 填写日期
  await page.$eval('input[name="ctl00$mainContent$sdate"]', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, startDate);
  await page.$eval('input[name="ctl00$mainContent$edate"]', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, endDate);
  // 4. 点击 Go 按钮
  await page.click('input[name="ctl00$mainContent$srchButton2"]');


  const options = await page.$$eval('select option', (opts) =>
    opts.map((opt) => ({ value: opt.value, text: opt.textContent }))
  );
  console.log('📌 下拉框选项:', options);


  console.log('📆 选择 "custom range"...');
  await page.select('select', 'custom range');


  // 设定起止日期
  // const d = new Date();
  // const endDate = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
  // const dStart = new Date();
  // dStart.setDate(d.getDate() - 30);
  // const startDate = `${dStart.getMonth()+1}/${dStart.getDate()}/${dStart.getFullYear()}`;


  // 清理旧下载文件记录
  await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
  const beforeFiles = new Set(fssync.readdirSync(DOWNLOAD_DIR));


  console.log('🖱️ 触发 Go 按钮点击（稳定方式）...');
  await page.evaluate(() => {
    const goButton = document.querySelector('input[value="Go"]');
    if (goButton) goButton.click();
  });


  console.log('⏳ 等待文件下载...');
  const maxWait = 15000;
  const interval = 500;
  const start = Date.now();


  while (Date.now() - start < maxWait) {
    const nowFiles = new Set(fssync.readdirSync(DOWNLOAD_DIR));
    const newFiles = [...nowFiles].filter((f) => !beforeFiles.has(f) && f.endsWith('.xlsx'));
    if (newFiles.length > 0) {
      console.log('✅ 下载成功：', newFiles[0]);
      break;
    }
    await new Promise((r) => setTimeout(r, interval));
  }


  console.log('🎉 脚本执行完成。');
  await browser.close();
})();
