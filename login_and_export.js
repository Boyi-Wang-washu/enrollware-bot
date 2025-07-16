// login_and_export.js
import fs from 'node:fs/promises';
import fssync from 'fs';
import path from 'node:path';
import { connect } from 'puppeteer-real-browser';
import dotenv from 'dotenv';
// import { uploadAllExcelFiles } from './upload-to-drive.js';
dotenv.config();


console.log('USER:', process.env.EW_USER);
console.log('PASS:', process.env.EW_PASS);


// Chrome路径，支持云端和本地环境
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
  const { browser, page } = await connect({
    headless: process.env.NODE_ENV === 'production' ? true : false, // 云端环境使用headless
    turnstile: true,
    customConfig: {
      chromePath,
      userDataDir: path.join(process.cwd(), 'chrome-data'),
      executablePath: chromeDriverPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-popup-blocking',
        '--disable-notifications',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ],
    },
    connectOption: {
      defaultViewport: null,
    },
  });

  // 设置全局 navigation 超时时间为 60 秒
  page.setDefaultNavigationTimeout(60000);
  
  // 设置用户代理
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // 隐藏 webdriver 属性
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  // 先访问 class-list.aspx
  console.log('🧭 正在前往 class-list.aspx...');
  await page.goto('https://www.enrollware.com/admin/class-list.aspx', { waitUntil: 'domcontentloaded' });

  // 判断是否需要登录
  const needLogin = await page.$('input[name="username"]') !== null;
  if (needLogin) {
    try {
      console.log('⌨️ 需要登录，输入用户名和密码...');
      
      // 直接设置用户名和密码
      console.log('输入用户名:', CREDS.user);
      await page.fill('input[name="username"]', CREDS.user);
      
      console.log('输入密码: [已隐藏]');
      await page.fill('input[name="password"]', CREDS.pass);
      
      // 验证输入是否正确
      const usernameValue = await page.$eval('input[name="username"]', el => el.value);
      const passwordValue = await page.$eval('input[name="password"]', el => el.value);
      console.log('输入验证 - 用户名:', usernameValue === CREDS.user ? '✅' : `❌ (期望: ${CREDS.user}, 实际: ${usernameValue})`);
      console.log('输入验证 - 密码:', passwordValue === CREDS.pass ? '✅' : `❌ (期望长度: ${CREDS.pass.length}, 实际长度: ${passwordValue.length})`);
      
      // 等待一下再点击登录
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('�� 点击登录按钮...');
      await page.realClick('input[type="submit"]');
      console.log('🛡️ 等待跳转页面...');
      
      // 先等待页面跳转完成
      try {
        await page.waitForNavigation({ timeout: 60000, waitUntil: 'domcontentloaded' });
      } catch (e) {
        console.log('⚠️ 页面跳转超时，继续检查当前页面状态...');
      }
      
      // 检查当前页面URL
      const currentURL = page.url();
      console.log('📍 当前页面URL:', currentURL);
      
      // 如果还在登录页，说明登录失败
      if (currentURL.includes('login') || currentURL.includes('signin') || await page.$('input[name="username"]') !== null) {
        console.log('❌ 登录失败，页面仍在登录界面');
        await page.screenshot({ path: 'error.png' });
        const pageContent = await page.content();
        console.log('页面HTML片段:', pageContent.slice(0, 1000));
        await browser.close();
        process.exit(1);
      }
      
      // 如果跳转到了class-list页面，等待目标元素
      if (currentURL.includes('class-list.aspx')) {
        try {
          await page.waitForSelector('select[name="ctl00$mainContent$regdateType"]', { visible: true, timeout: 30000 });
          console.log('✅ 登录成功!');
        } catch (e) {
          console.log('⚠️ 找不到目标下拉框，打印页面内容...');
          await page.screenshot({ path: 'error.png' });
          const pageContent = await page.content();
          console.log('页面HTML片段:', pageContent.slice(0, 1000));
          await browser.close();
          process.exit(1);
        }
      } else {
        console.log('❌ 登录后跳转到未知页面:', currentURL);
        await page.screenshot({ path: 'error.png' });
        const pageContent = await page.content();
        console.log('页面HTML片段:', pageContent.slice(0, 1000));
        await browser.close();
        process.exit(1);
      }
    } catch (e) {
      console.log('❌ 登录流程异常:', e);
      await page.screenshot({ path: 'error.png' });
      const currentURL = page.url();
      const pageContent = await page.content();
      console.log('当前URL:', currentURL);
      console.log('页面HTML片段:', pageContent.slice(0, 1000)); // 只打印前1000字符
      await browser.close();
      process.exit(1);
    }
  } else {
    console.log('✅ 已登录，无需再次登录!');
  }

  try {
    console.log('📄 正在跳转到导出页面...');
    await page.goto('https://www.enrollware.com/admin/student-export.aspx', { waitUntil: 'domcontentloaded' });
    // 等待页面关键元素渲染出来
    await page.waitForSelector('select[name="ctl00$mainContent$regdateType"]', { visible: true, timeout: 20000 });
    await page.waitForSelector('select[name="ctl00$mainContent$dateType"]', { visible: true, timeout: 20000 });
  } catch (e) {
    console.log('❌ 跳转导出页面异常:', e);
    await page.screenshot({ path: 'error.png' });
    await browser.close();
    process.exit(1);
  }

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
  
  // 上传到Google Drive（暂时注释掉）
  // try {
  //   await uploadAllExcelFiles(DOWNLOAD_DIR);
  // } catch (error) {
  //   console.log('⚠️ Google Drive upload failed, but export completed successfully');
  // }
  
  await browser.close();
})();
 