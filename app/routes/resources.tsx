import { Link } from 'react-router';

const resourcesPage = () => {
  return (
    <>
      <h1>Resouces Tables come here</h1>
      <p>
        Resources Tables{' '}
        <span>
          <Link
            to="https://www.figma.com/design/VGGqwl3Eq3GQIAO9I6LoNW/PHLASK?node-id=14066-36739&t=8b1bKp5qzaIsi3w0-0"
            className="text-blue-600 underline hover:underline font-medium"
          >
            design here
          </Link>
        </span>
      </p>
    </>
  );
};

export default resourcesPage;
